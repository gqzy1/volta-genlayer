// Recovery after the 2026-11-10 ~04:47 CST runtime restart wiped /tmp:
// rebuild /home/hatch/workspace/milestones/volta-evidence-work/{keys,progress}.json
// from on-chain state + evidence/source-verified.json (case a, complete).
// Fresh temp accounts for all roles; the old case-(b) book
// (0xf0c5029307daf106da32f69bf6b4f8bb3ca77d4c:exhibition-tampered-v2,
// seal 0xc82b0a6f…) is orphaned — its key was in the wiped /tmp — and
// case (b) will be re-sealed with the fresh B account on re-run.
// Run: node scripts/recover-progress.mjs   (then delete this file? No:
// keep it in the repo as a record of the recovery; it contains no keys.)
import {createClient, generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
import {readFileSync, writeFileSync, mkdirSync, chmodSync} from 'node:fs';
import {createHash} from 'node:crypto';

const WORK = '/home/hatch/workspace/milestones/volta-evidence-work';
const REPO = new URL('../', import.meta.url).pathname;
const SOURCE = readFileSync(`${REPO}contracts/volta.py`, 'utf8');
const SOURCE_SHA = createHash('sha256').update(SOURCE).digest('hex');
const ADDRESS = '0xD81546dC6478121D9bd1DEf95Ae4901b0DF196d8';
const DEPLOY_HASH = '0x56e461fb8216f255e132909e02662d370d262b9d3ad43f60b25035389a3a3acd';
const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? x.toString() : x)));

mkdirSync(WORK, {recursive: true});
const readClient = createClient({chain: studionet});

// fresh keys (old ones were lost with /tmp)
const keys = {};
for (const role of ['deployer', 'A', 'B', 'C', 'D', 'E', 'F']) keys[role] = generatePrivateKey();
writeFileSync(`${WORK}/keys.json`, JSON.stringify(keys, null, 2));
chmodSync(`${WORK}/keys.json`, 0o600);
console.log('fresh keys written (0600)');

// re-verify the deployment from chain state
const tx = plain(await readClient.getTransaction({hash: DEPLOY_HASH}));
console.log('deploy tx status/result:', tx.statusName, tx.result_name || tx.resultName);
if (tx.statusName !== 'FINALIZED') throw new Error('deploy tx not FINALIZED');
const code = await readClient.getContractCode(ADDRESS);
if (code !== SOURCE) throw new Error('deployed code mismatch');
const protoRaw = await readClient.readContract({address: ADDRESS, functionName: 'get_protocol', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
let protocol;
try { protocol = JSON.parse(protoRaw); } catch { protocol = protoRaw; }
console.log('protocol readback:', protocol);
if (protocol !== 'volta-2') throw new Error('protocol mismatch');

// rebuild progress from evidence/source-verified.json
const ev = JSON.parse(readFileSync(`${REPO}evidence/source-verified.json`, 'utf8'));
if (ev.contract !== ADDRESS || ev.deployTransaction !== DEPLOY_HASH || ev.sourceSha256 !== SOURCE_SHA) {
  throw new Error('source-verified.json does not match the known deployment');
}
const progress = {
  address: ADDRESS,
  recoveredAfterRestart: '2026-11-10 ~04:47 CST: /tmp wiped, keys+progress lost; rebuilt from chain + evidence/source-verified.json. Orphaned: case-(b) book 0xf0c5029307daf106da32f69bf6b4f8bb3ca77d4c:exhibition-tampered-v2 (seal 0xc82b0a6f…), key lost, will be re-sealed with fresh B account.',
  steps: {
    fixtures: {
      honestUrl: ev.fixture.url,
      honestSource: ev.case.seal.book ? undefined : undefined,
    },
    deploy: {hash: DEPLOY_HASH, tx, votes: {raw: tx.consensus_data || null}, address: ADDRESS, sourceSha256: SOURCE_SHA, protocol},
    'case-a': ev.case,
  },
};
// fixtures step needs the honest source; re-derive it from the case-a book readback
const bookRaw = await readClient.readContract({address: ADDRESS, functionName: 'get_book', args: [ev.case.bookId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
const book = JSON.parse(bookRaw);
progress.steps.fixtures = {
  honestUrl: ev.fixture.url,
  injectionUrl: 'https://raw.githubusercontent.com/gqzy1/volta-genlayer/83598827f3ba63b4aac85346c11124fcce3bdfa3/fixtures/volta-source-injection.txt',
  unreachableUrl: 'https://raw.githubusercontent.com/gqzy1/volta-genlayer/83598827f3ba63b4aac85346c11124fcce3bdfa3/fixtures/does-not-exist.txt',
  honestSource: book.input.source,
  honestLength: book.input.source.length,
  injectionLength: 416,
};
writeFileSync(`${WORK}/progress.json`, JSON.stringify(progress, null, 2));
writeFileSync(`${WORK}/deploy.json`, JSON.stringify({hash: DEPLOY_HASH}, null, 2));
console.log('progress rebuilt: fixtures + deploy + case-a done; case-b..f pending');
console.log('case-a book published:', book.published, 'order:', JSON.stringify(book.order));
