// Deploy VOLTA v2 (volta-2) to Stable Studionet and produce all on-chain
// source-verification evidence. Run: node scripts/deploy-v2-evidence.mjs
//
// Keys: fresh temporary accounts, stored ONLY in /tmp/volta-v2/keys.json
// (mode 0600). Nothing in this script writes keys into the repo.
// Progress: /tmp/volta-v2/progress.json — re-running resumes after the
// last completed step and never re-sends a write that already finalized.
// Evidence JSONs are written under evidence/ (new files only).
//
// Source-verification design (contract, deterministic code only):
// assess() fetches the sealed source_url and checks, by normalized
// containment, whether the sealed excerpt appears in the fetched page.
// Fetched page text is untrusted data: it never reaches a model and
// never decides anything by itself. The injection fixture (case d)
// carries an instruction to report VERIFIED; the expected on-chain
// outcome is SOURCE_MISMATCH, which is exactly what this run proves.
import {createClient, createAccount, generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant, TransactionStatus} from 'genlayer-js/types';
import {readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync} from 'node:fs';
import {createHash} from 'node:crypto';

const RPC = 'https://studio.genlayer.com/api';
// Workdir is OUTSIDE the repo and persistent across runtime restarts:
// /tmp was wiped by a restart mid-run (2026-11-10 ~04:47 CST), losing
// keys.json + progress.json and orphaning the in-flight case-(b) book.
// Temp keys live only here, mode 0600, deleted when the run is done.
const WORK = '/home/hatch/workspace/milestones/volta-evidence-work';
const SOURCE = readFileSync(new URL('../contracts/volta.py', import.meta.url), 'utf8');
const SOURCE_SHA = createHash('sha256').update(SOURCE).digest('hex');
const EVIDENCE_DIR = new URL('../evidence/', import.meta.url).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const COMMIT = '83598827f3ba63b4aac85346c11124fcce3bdfa3';
const HONEST_URL = `https://raw.githubusercontent.com/gqzy1/volta-genlayer/${COMMIT}/fixtures/volta-source-honest.txt`;
const INJECTION_URL = `https://raw.githubusercontent.com/gqzy1/volta-genlayer/${COMMIT}/fixtures/volta-source-injection.txt`;
const UNREACHABLE_URL = `https://raw.githubusercontent.com/gqzy1/volta-genlayer/${COMMIT}/fixtures/does-not-exist.txt`;

mkdirSync(WORK, {recursive: true});

// ---- keys (temp accounts, /tmp only, never in the repo) ----
const KEYS_FILE = `${WORK}/keys.json`;
let keys;
if (existsSync(KEYS_FILE)) {
  keys = JSON.parse(readFileSync(KEYS_FILE, 'utf8'));
} else {
  const roles = ['deployer', 'A', 'B', 'C', 'D', 'E', 'F'];
  keys = {};
  for (const role of roles) keys[role] = generatePrivateKey();
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
  chmodSync(KEYS_FILE, 0o600);
}
const accounts = {};
for (const [role, pk] of Object.entries(keys)) accounts[role] = createAccount(pk);
const addr = (role) => accounts[role].address.toLowerCase();

// ---- progress (resume-safe) ----
const PROGRESS_FILE = `${WORK}/progress.json`;
let progress = existsSync(PROGRESS_FILE) ? JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')) : {steps: {}};
const saveProgress = () => writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
const done = (id) => Boolean(progress.steps[id]);
const mark = (id, data) => { progress.steps[id] = data; saveProgress(); };

const readClient = createClient({chain: studionet});
const clientFor = (role) => createClient({chain: studionet, account: accounts[role]});
const log = (...a) => console.log(new Date().toISOString(), ...a);
const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? x.toString() : x)));

async function preflight() {
  const id = await readClient.request({method: 'eth_chainId', params: []});
  if (Number(id) !== 61999) throw new Error(`RPC is not chain 61999 (got ${id})`);
  const gas = await readClient.request({method: 'eth_gasPrice', params: []});
  if (BigInt(gas) !== 0n) throw new Error(`gas price is not zero (got ${gas})`);
  log('preflight ok: chain 61999, zero gas');
}

async function fetchFixture(url, expectStatus) {
  const res = await fetch(url);
  if (res.status !== expectStatus) throw new Error(`fixture ${url}: HTTP ${res.status}, expected ${expectStatus}`);
  const text = await res.text();
  log(`fixture ${url.slice(0, 80)}… HTTP ${res.status} (${text.length} chars)`);
  return text;
}

async function readView(address, functionName, args) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const raw = await readClient.readContract({address, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
      if (raw === '' || raw === null || raw === undefined) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    } catch (e) {
      log(`read ${functionName} RPC error (attempt ${attempt}/5): ${String(e?.message || e).slice(0, 160)} — retrying in 10s`);
      if (attempt < 5) await sleep(10000);
    }
  }
  throw new Error(`read ${functionName} failed after 5 attempts`);
}
const getBook = (address, bookId) => readView(address, 'get_book', [bookId]);
const getReview = (address, bookId, revision) => readView(address, 'get_review', [bookId, revision]);
async function getProtocol(address) {
  const raw = await readView(address, 'get_protocol', []);
  return typeof raw === 'string' ? raw : raw?.protocol ?? String(raw);
}

async function getContractCodePoll(address, tries = 18) {
  for (let i = 0; i < tries; i++) {
    try {
      const code = await readClient.getContractCode(address);
      if (code) return code;
    } catch (e) { /* not indexed yet */ }
    log(`getContractCode not ready yet (${i + 1}/${tries}), waiting 10s`);
    await sleep(10000);
  }
  throw new Error(`getContractCode never returned for ${address}`);
}

// Receipt waiting with retries: the Studionet RPC occasionally answers a
// poll with an HTML error page instead of JSON (transient infra failure,
// not a chain failure). Never kill the run on the first RPC error.
async function waitReceipt(hash) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      return await clientFor('deployer').waitForTransactionReceipt({hash, status: TransactionStatus.FINALIZED, interval: 10000, retries: 180});
    } catch (err) {
      lastErr = err;
      log(`receipt wait RPC error (attempt ${attempt}/10, tx ${hash.slice(0, 18)}…): ${String(err?.message || err).slice(0, 200)} — retrying in 30s`);
      if (attempt < 10) await sleep(30000);
    }
  }
  throw lastErr;
}

// Send a write, wait for FINALIZED, return {hash, tx, receipt} with tx normalized.
async function sendWrite(role, address, method, args, label) {
  const client = clientFor(role);
  const hash = await client.writeContract({address, functionName: method, args, value: 0n, leaderOnly: false, consensusMaxRotations: 3});
  log(`${label}: sent ${hash} (from ${addr(role)})`);
  const receipt = await waitReceipt(hash);
  const tx = plain(await readClient.getTransaction({hash}));
  const status = tx.statusName || receipt.statusName;
  const result = tx.result_name || tx.resultName;
  log(`${label}: ${status}/${result} ${hash}`);
  if (status !== 'FINALIZED') throw new Error(`${label}: not FINALIZED (${status})`);
  return {hash, tx, receipt: plain(receipt)};
}

// A write that MUST fail on-chain (publish of a non-ORDERABLE book).
// Records whatever actually happened: a client-side rejection (no tx),
// or a submitted tx with its FINALIZED receipt. Caller asserts state
// is unchanged afterwards.
async function sendWriteExpectFail(role, address, method, args, label) {
  let hash = null;
  try {
    hash = await clientFor(role).writeContract({address, functionName: method, args, value: 0n, leaderOnly: false, consensusMaxRotations: 3});
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 500);
    log(`${label}: rejected client-side (no tx submitted): ${msg}`);
    return {hash: null, tx: null, error: msg, clientRejected: true};
  }
  log(`${label} tx (expected to fail on chain): ${hash}`);
  const receipt = await waitReceipt(hash);
  const tx = plain(await readClient.getTransaction({hash}));
  const status = tx.statusName || receipt.statusName;
  const result = tx.result_name || tx.resultName;
  log(`${label}: ${status}/${result} ${hash}`);
  if (status !== 'FINALIZED') throw new Error(`${label}: not FINALIZED (${status})`);
  return {hash, tx, receipt: plain(receipt), clientRejected: false};
}

function votesOf(tx) {
  const cd = tx?.consensus_data;
  if (!cd) return null;
  // Preserve the vote map in whatever shape the node returns, plus a
  // compact agree/disagree tally when the shape allows it.
  const out = {raw: cd};
  try {
    const receipts = cd.leader_receipt;
    if (Array.isArray(receipts)) {
      out.leaderReceipts = receipts.map((r) => ({mode: r.mode, execution_result: r.execution_result, result_status: r.result?.status ?? r.result_status ?? null}));
    }
    const votes = cd.votes ?? cd.consensus_votes ?? cd.validator_votes;
    if (Array.isArray(votes)) out.votes = votes;
  } catch { /* keep raw only */ }
  return out;
}

function step(id, fn) {
  return (async () => {
    if (done(id)) { log(`skip ${id} (already done)`); return progress.steps[id]; }
    const data = await fn();
    mark(id, data);
    return data;
  })();
}

function writeEvidence(name, obj) {
  const path = `${EVIDENCE_DIR}${name}`;
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
  log(`wrote evidence/${name}`);
}

const base = (label) => ({application: 'VOLTA', protocol: 'volta-2', network: 61999, exportedAt: new Date().toISOString(), label});

const EXHIBITION_STEPS = [
  {id: 'S1', text: 'Approve the object list'},
  {id: 'S2', text: 'Sign the loan agreements'},
  {id: 'S3', text: 'Collect the sculptures'},
  {id: 'S4', text: 'Install the sculptures'},
  {id: 'S5', text: 'Open the exhibition'},
];
const EXHIBITION_TITLE = 'Opening the sculpture exhibition';

// Assess loop: up to 3 attempts. A MAJORITY_DISAGREE (or any
// non-SUCCESS) assess is retried with the new expected revision.
// A WRONG source.status is a hard failure for that case: stop, do not
// retry it into a pass, do not publish it.
async function assessUntil(address, role, bookId, expectedSource, expectedGraph, label, maxAttempts = 6) {
  const attempts = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const book = await getBook(address, bookId);
    const rev = book.revision;
    const {hash, tx} = await sendWrite(role, address, 'assess', [bookId, rev], `${label} assess attempt ${attempt} (rev ${rev})`);
    const review = await getReview(address, bookId, rev + 1);
    const result = tx.result_name || tx.resultName;
    const rec = {attempt, hash, tx, votes: votesOf(tx), review};
    attempts.push(rec);
    log(`${label} assess attempt ${attempt}: result=${result} source=${review?.source?.status} graph=${review?.graph?.status}`);
    if (!review) {
      // A consensus split stores no review (v1.1 history: the
      // MAJORITY_DISAGREE assessment created no accepted review).
      // Retry with the new expected revision; the revision is unchanged.
      if (result && String(result).includes('DISAGREE')) {
        log(`${label} assess attempt ${attempt}: ${result}, no review stored — retrying`);
        continue;
      }
      throw new Error(`${label}: assess tx ${result} but no review stored at revision ${rev + 1}`);
    }
    if (review?.source?.status !== expectedSource) {
      throw new Error(`${label}: WRONG source status ${review?.source?.status}, expected ${expectedSource} — STOP, not retried, not published. Attempts: ${attempts.map((a) => a.hash).join(', ')}`);
    }
    if (result && String(result).includes('DISAGREE')) {
      log(`${label} assess attempt ${attempt}: consensus ${result} despite stored review, retrying with new revision`);
      continue;
    }
    if (review?.graph?.status === expectedGraph) return {attempts, review};
    log(`${label} assess attempt ${attempt}: graph ${review?.graph?.status}, expected ${expectedGraph} — retrying (model variance)`);
  }
  throw new Error(`${label}: assess did not reach graph ${expectedGraph} in ${maxAttempts} attempts (source status was correct: ${expectedSource})`);
}

async function sealCase(address, role, slug, payload, label) {
  const {hash, tx} = await sendWrite(role, address, 'seal', [slug, JSON.stringify(payload)], `${label} seal`);
  const bookId = `${addr(role)}:${slug}`;
  const book = await getBook(address, bookId);
  if (!book || book.id !== bookId) throw new Error(`${label}: seal readback missing book ${bookId}`);
  return {hash, tx, votes: votesOf(tx), bookId, book};
}

async function publishCase(address, role, bookId, order, label) {
  const bookBefore = await getBook(address, bookId);
  const {hash, tx} = await sendWrite(role, address, 'publish', [bookId, bookBefore.revision, JSON.stringify(order)], `${label} publish`);
  const book = await getBook(address, bookId);
  if (book.published !== book.revision) throw new Error(`${label}: publish readback published=${book.published} revision=${book.revision}`);
  if (JSON.stringify(book.order) !== JSON.stringify(order)) throw new Error(`${label}: publish readback order mismatch`);
  return {hash, tx, votes: votesOf(tx), book};
}

async function publishBlockedCase(address, role, bookId, order, label) {
  const bookBefore = await getBook(address, bookId);
  const res = await sendWriteExpectFail(role, address, 'publish', [bookId, bookBefore.revision, JSON.stringify(order)], `${label} publish (must fail NOT_ORDERABLE)`);
  const bookAfter = await getBook(address, bookId);
  if (bookAfter.published !== 0) throw new Error(`${label}: book published despite blocked publish!`);
  if (bookAfter.revision !== bookBefore.revision) throw new Error(`${label}: revision changed on failed publish`);
  if (res.hash) {
    const result = res.tx?.result_name || res.tx?.resultName;
    log(`${label} failed publish tx result: ${result}`);
  }
  return {...res, votes: res.tx ? votesOf(res.tx) : null, bookBefore, bookAfter};
}

async function main() {
  log(`source SHA-256 ${SOURCE_SHA}`);
  log(`fixtures pinned to commit ${COMMIT}`);
  await preflight();

  // ---- fixtures (version-pinned, verified here before any seal) ----
  const fixtures = await step('fixtures', async () => {
    const honest = await fetchFixture(HONEST_URL, 200);
    const injection = await fetchFixture(INJECTION_URL, 200);
    await fetchFixture(UNREACHABLE_URL, 404);
    const honestSource = honest.replace(/\n$/, '');
    if (honestSource.length !== 401) throw new Error(`honest source length ${honestSource.length}, expected 401`);
    return {honestUrl: HONEST_URL, injectionUrl: INJECTION_URL, unreachableUrl: UNREACHABLE_URL, honestSource, honestLength: honestSource.length, injectionLength: injection.length};
  });
  const HONEST_SOURCE = fixtures.honestSource;
  // Tamper for case (b): ONE word changed inside a prerequisite sentence
  // ("signed" -> "countersigned"), keeping every prerequisite direction
  // and every step description identical to the honest source. The
  // deterministic containment check must still return MISMATCH, because
  // the sealed excerpt no longer appears verbatim in the fetched page.
  // NOTE (2026-11-10): the first tamper tried was the coordinator's
  // example — reversing the loan-agreement/transport prerequisite
  // ("transport may collect before the loan agreements are signed").
  // That reversal split consensus 4 times in a row (MAJORITY_DISAGREE,
  // no review stored: 0x4432c07c…, 0xdbb75c69…, 0xc27546c5…, 0xad104871…),
  // because the reversed sentence leaves the S1/S3 entailment genuinely
  // ambiguous to the model validators, so no source.status was ever
  // produced. The reversal confounds the model assessment with the
  // deterministic source check; the minimal one-word tamper isolates
  // exactly the property case (b) must prove (containment fails when
  // the sealed excerpt differs by one word). Orphaned books from the
  // reversal attempts: 0xf0c50293…:exhibition-tampered-v2 (key lost in
  // the /tmp wipe) and 0x43a2a34f…:exhibition-tampered-v2 (attempt-3 tx
  // 0x485c03a2… in flight when the run was stopped).
  const TAMPERED_SOURCE = HONEST_SOURCE.replace(
    'Loan agreements must be signed before the transport team may collect the sculptures.',
    'Loan agreements must be countersigned before the transport team may collect the sculptures.',
  );
  if (TAMPERED_SOURCE === HONEST_SOURCE) throw new Error('tampered source construction failed (sentence not found)');
  if (TAMPERED_SOURCE.length < 40) throw new Error('tampered source too short');

  // ---- 1. deploy ----
  const deploy = await step('deploy', async () => {
    const resumeFile = `${WORK}/deploy.json`;
    let hash;
    if (existsSync(resumeFile)) {
      hash = JSON.parse(readFileSync(resumeFile, 'utf8')).hash;
      log(`resuming deploy from saved hash ${hash}`);
    } else {
      const client = clientFor('deployer');
      hash = await client.deployContract({code: SOURCE, args: [], leaderOnly: false, consensusMaxRotations: 3});
      log(`deploy sent ${hash} (from ${addr('deployer')})`);
      writeFileSync(resumeFile, JSON.stringify({hash}, null, 2));
    }
    const client = clientFor('deployer');
    await client.waitForTransactionReceipt({hash, status: TransactionStatus.FINALIZED, interval: 10000, retries: 180});
    const tx = plain(await readClient.getTransaction({hash}));
    if (tx.statusName !== 'FINALIZED') throw new Error(`deploy not FINALIZED (${tx.statusName})`);
    const address = tx.to_address || tx.recipient || tx.txDataDecoded?.contractAddress || '';
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error(`deploy receipt has no contract address: ${JSON.stringify(tx).slice(0, 500)}`);
    const code = await getContractCodePoll(address);
    if (code !== SOURCE) throw new Error('deployed source is NOT byte-identical to contracts/volta.py');
    const protocol = await getProtocol(address);
    if (protocol !== 'volta-2') throw new Error(`unexpected protocol ${JSON.stringify(protocol)}`);
    log(`deployed ${address} protocol=${protocol}`);
    return {hash, tx, votes: votesOf(tx), address, sourceSha256: SOURCE_SHA, protocol};
  });
  const ADDRESS = deploy.address;
  progress.address = ADDRESS;
  saveProgress();

  const order5 = ['S1', 'S2', 'S3', 'S4', 'S5'];

  // ---- (a) honest: VERIFIED + ORDERABLE + publish ----
  const caseA = await step('case-a', async () => {
    const payload = {title: EXHIBITION_TITLE, source_url: HONEST_URL, source: HONEST_SOURCE, steps: EXHIBITION_STEPS};
    const seal = await sealCase(ADDRESS, 'A', 'exhibition-honest-v2', payload, 'case (a) honest');
    const assess = await assessUntil(ADDRESS, 'A', seal.bookId, 'VERIFIED', 'ORDERABLE', 'case (a) honest');
    const publish = await publishCase(ADDRESS, 'A', seal.bookId, order5, 'case (a) honest');
    const book = await getBook(ADDRESS, seal.bookId);
    const review = await getReview(ADDRESS, seal.bookId, book.revision);
    return {bookId: seal.bookId, seal, assess, publish, book, review};
  });
  writeEvidence('source-verified.json', {...base('Honest source URL: sealed excerpt found in the fetched page, source VERIFIED, graph ORDERABLE, published'), contract: ADDRESS, deployTransaction: deploy.hash, sourceSha256: SOURCE_SHA, fixture: {url: HONEST_URL, length: fixtures.honestLength}, case: caseA});

  // ---- (b) tampered excerpt vs honest URL: MISMATCH + REVIEW, publish MUST fail ----
  const caseB = await step('case-b', async () => {
    const payload = {title: EXHIBITION_TITLE, source_url: HONEST_URL, source: TAMPERED_SOURCE, steps: EXHIBITION_STEPS};
    const seal = await sealCase(ADDRESS, 'B', 'exhibition-tampered2-v2', payload, 'case (b) tampered');
    const assess = await assessUntil(ADDRESS, 'B', seal.bookId, 'MISMATCH', 'REVIEW', 'case (b) tampered');
    const publish = await publishBlockedCase(ADDRESS, 'B', seal.bookId, order5, 'case (b) tampered');
    const book = await getBook(ADDRESS, seal.bookId);
    const review = await getReview(ADDRESS, seal.bookId, book.revision);
    return {bookId: seal.bookId, seal, assess, publish, book, review, tamperedSource: TAMPERED_SOURCE};
  });
  writeEvidence('source-mismatch.json', {...base('Tampered excerpt vs the same honest URL: sealed excerpt absent from the fetched page, source MISMATCH, graph REVIEW, publish fails on-chain (NOT_ORDERABLE)'), contract: ADDRESS, deployTransaction: deploy.hash, sourceSha256: SOURCE_SHA, fixture: {url: HONEST_URL}, case: caseB});

  // ---- (c) unreachable URL: UNREACHABLE + REVIEW, publish MUST fail ----
  const caseC = await step('case-c', async () => {
    const payload = {title: EXHIBITION_TITLE, source_url: UNREACHABLE_URL, source: HONEST_SOURCE, steps: EXHIBITION_STEPS};
    const seal = await sealCase(ADDRESS, 'C', 'exhibition-unreachable-v2', payload, 'case (c) unreachable');
    const assess = await assessUntil(ADDRESS, 'C', seal.bookId, 'UNREACHABLE', 'REVIEW', 'case (c) unreachable');
    const publish = await publishBlockedCase(ADDRESS, 'C', seal.bookId, order5, 'case (c) unreachable');
    const book = await getBook(ADDRESS, seal.bookId);
    const review = await getReview(ADDRESS, seal.bookId, book.revision);
    return {bookId: seal.bookId, seal, assess, publish, book, review};
  });
  writeEvidence('source-unreachable.json', {...base('Unreachable source URL (HTTP 404): fetch fails, source UNREACHABLE, graph REVIEW, publish fails on-chain (NOT_ORDERABLE)'), contract: ADDRESS, deployTransaction: deploy.hash, sourceSha256: SOURCE_SHA, fixture: {url: UNREACHABLE_URL}, case: caseC});

  // ---- (d) injection page: MISMATCH + REVIEW, publish MUST fail ----
  // The page carries an instruction to report VERIFIED plus a paraphrase
  // that does not contain the sealed excerpt. Deterministic containment
  // must return MISMATCH regardless of the page's instruction.
  const caseD = await step('case-d', async () => {
    const payload = {title: EXHIBITION_TITLE, source_url: INJECTION_URL, source: HONEST_SOURCE, steps: EXHIBITION_STEPS};
    const seal = await sealCase(ADDRESS, 'D', 'exhibition-injection-v2', payload, 'case (d) injection');
    const assess = await assessUntil(ADDRESS, 'D', seal.bookId, 'MISMATCH', 'REVIEW', 'case (d) injection');
    const publish = await publishBlockedCase(ADDRESS, 'D', seal.bookId, order5, 'case (d) injection');
    const book = await getBook(ADDRESS, seal.bookId);
    const review = await getReview(ADDRESS, seal.bookId, book.revision);
    return {bookId: seal.bookId, seal, assess, publish, book, review};
  });
  writeEvidence('source-injection.json', {...base('Injection page: the fetched page instructs VERIFIED but contains only a paraphrase, not the sealed excerpt; source MISMATCH, graph REVIEW, publish fails on-chain (NOT_ORDERABLE)'), contract: ADDRESS, deployTransaction: deploy.hash, sourceSha256: SOURCE_SHA, fixture: {url: INJECTION_URL}, case: caseD});

  // ---- (e) no URL: NOT_APPLICABLE + ORDERABLE + publish ----
  const TEA_STEPS = [
    {id: 'S1', text: 'Boil the water'},
    {id: 'S2', text: 'Steep the tea leaves'},
    {id: 'S3', text: 'Pour the tea into cups'},
  ];
  const TEA_SOURCE = 'Fill the kettle with fresh water and bring it to a boil before pouring it over the tea leaves. Pour the boiling water over the tea leaves and let the leaves steep for three minutes before pouring the tea into cups. Pour the tea into cups only after the water has boiled and the leaves have steeped.';
  const caseE = await step('case-e', async () => {
    const payload = {title: 'Brewing a pot of tea', source_url: '', source: TEA_SOURCE, steps: TEA_STEPS};
    const seal = await sealCase(ADDRESS, 'E', 'tea-no-url-v2', payload, 'case (e) no URL');
    const assess = await assessUntil(ADDRESS, 'E', seal.bookId, 'NOT_APPLICABLE', 'ORDERABLE', 'case (e) no URL');
    const publish = await publishCase(ADDRESS, 'E', seal.bookId, ['S1', 'S2', 'S3'], 'case (e) no URL');
    const book = await getBook(ADDRESS, seal.bookId);
    const review = await getReview(ADDRESS, seal.bookId, book.revision);
    return {bookId: seal.bookId, seal, assess, publish, book, review};
  });
  writeEvidence('source-not-applicable.json', {...base('No source URL: source NOT_APPLICABLE, graph ORDERABLE, published'), contract: ADDRESS, deployTransaction: deploy.hash, sourceSha256: SOURCE_SHA, case: caseE});

  // ---- (f) regression: exact v1.1 five-step exhibition flow on v2, no URL ----
  const caseF = await step('case-f', async () => {
    const payload = {title: EXHIBITION_TITLE, source_url: '', source: HONEST_SOURCE, steps: EXHIBITION_STEPS};
    const seal = await sealCase(ADDRESS, 'F', 'exhibition-20261026', payload, 'case (f) regression');
    const assess = await assessUntil(ADDRESS, 'F', seal.bookId, 'NOT_APPLICABLE', 'ORDERABLE', 'case (f) regression');
    const publish = await publishCase(ADDRESS, 'F', seal.bookId, order5, 'case (f) regression');
    const book = await getBook(ADDRESS, seal.bookId);
    const review = await getReview(ADDRESS, seal.bookId, book.revision);
    return {bookId: seal.bookId, seal, assess, publish, book, review};
  });
  writeEvidence('regression-v2.json', {...base('v1.1 five-step exhibition flow re-run on the v2 contract with no source URL: source NOT_APPLICABLE, graph ORDERABLE, published'), contract: ADDRESS, deployTransaction: deploy.hash, sourceSha256: SOURCE_SHA, case: caseF});

  // ---- deployment record ----
  writeEvidence('deployment-v2.json', {
    network: 61999,
    protocol: 'volta-2',
    sourceSha256: SOURCE_SHA,
    contractAddress: ADDRESS,
    transaction: deploy.tx,
    votes: deploy.votes,
    deployTransactionHash: deploy.hash,
    exampleBookId: caseA.bookId,
  });

  log('ALL DONE');
  log(`contract ${ADDRESS}`);
  log(`deploy tx ${deploy.hash}`);
  log(`source SHA ${SOURCE_SHA}`);
  for (const [k, v] of Object.entries(progress.steps)) {
    if (v?.hash) log(`${k}: ${v.hash} (${v.tx?.statusName}/${v.tx?.result_name})`);
  }
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
