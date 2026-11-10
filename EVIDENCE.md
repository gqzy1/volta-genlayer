# Network evidence

Stable GenLayer Studionet, chain ID 61999, official RPC `https://studio.genlayer.com/api`. The active deployment and example are recorded in `public/deployment.json`. Raw receipts and finalized readbacks are in `evidence/`.

Local deterministic checks comprise ten JavaScript tests and seven mocked-host contract tests. The latter do not prove network consensus. The official schema endpoint validates the pinned contract ABI before deployment.

## Historical V1

The first source deployed successfully at `0xb27425eCc16F989767Ee166dE3560AbE87cA14D7`. Its source sealing succeeded. Assessment transaction `0x9020dc02e2a4c3231ddd0f6c4a1df3c264aee2177e5e0ccd5c2bc239f2cd41d5` finalized with majority disagreement and a leader `MAPPING_SIZE` exception. It did not create an accepted review. These records are retained in `evidence/historical-v1/` and are not evidence of a successful assessment.

The V1.1 source adds an explicit full output shape and deterministic normalization for an exact step-ID keyed mapping. It preserves all semantic equivalence and quote-grounding checks. The failed transaction is not retried or appealed; V1.1 uses a distinct deployment.

## Active V1.1 record

Contract: `0x1586f91c56b4983E312898627444CdF0A8ddfdee`. Source SHA256: `df3df3a1ca612772f9f971be91b153a480c7583a251c26e2f2570c3cb5736874`. Public example: `0x9e682033129d42b6e14e8ac6d8d0cb9358a23396:exhibition-20261026`.

| Operation | Transaction | Result |
| --- | --- | --- |
| deployment | [0x335b72b0…](https://explorer-studio.genlayer.com/tx/0x335b72b07e7fef9d5f22fd343e16e42cf7ff08bbb27b6715d79b0ae97e524bc4) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| seal | [0x164d802d…](https://explorer-studio.genlayer.com/tx/0x164d802d13c6e5aff8c93b29841090e81b3b101cafaa983de02993230badad74) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| assessment | [0xbfc7bc7f…](https://explorer-studio.genlayer.com/tx/0xbfc7bc7f614c6802f1d77e5ad1acc42543be2c3cd036846f18d454123850b00f) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| publication | [0xf6d414cc…](https://explorer-studio.genlayer.com/tx/0xf6d414ccae1d719e018509c5172baaf5313722f17e329a10f173e974304d540a) | FINALIZED / MAJORITY_AGREE / SUCCESS |

The five-step authored exhibition example produced ten directional pair relations and five topological levels. Publication stores S1, S2, S3, S4, S5 and its certificate digest. The assessment vote map contains three agree and two disagree votes; this is majority acceptance, not unanimity. `evidence/book.json` and `evidence/review.json` are finalized state readbacks.

## Active V2 record

Contract: `0xD81546dC6478121D9bd1DEf95Ae4901b0DF196d8`. Source SHA256: `b28b44bb5cf7fc8b782d22514b538cd7a023c532fcf7a247ce0fc008af57f227`. The V2 source adds deterministic source verification to assessment: the sealed `source_url` is fetched by deterministic code and the sealed excerpt must appear verbatim (after normalization) in the fetched page. The fetched page text never reaches a model. Source statuses are `VERIFIED`, `MISMATCH`, `UNREACHABLE`, or `NOT_APPLICABLE` (no URL). A book whose graph is `ORDERABLE` but whose source is `MISMATCH` or `UNREACHABLE` is forced to `REVIEW`, and `publish` raises `NOT_ORDERABLE` for it. Fixture URLs are pinned to commit `8359882`. Public example: `0xf2be2e617f5b3044c69f1075c2c28c8d6b1b7455:exhibition-honest-v2`.

| Operation | Transaction | Result |
| --- | --- | --- |
| deployment | [0x56e461fb…](https://explorer-studio.genlayer.com/tx/0x56e461fb8216f255e132909e02662d370d262b9d3ad43f60b25035389a3a3acd) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (a) honest seal | [0xbd6adea5…](https://explorer-studio.genlayer.com/tx/0xbd6adea58831517183c289aaaf12ed4651b5c0280fc843beae37c56f7f583b37) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (a) honest assessment | [0xf30e397d…](https://explorer-studio.genlayer.com/tx/0xf30e397d63183d8ff36ed57b4534e8349f9c039ad4803ad4108178771adb31b9) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (a) honest publication | [0xb2012eb7…](https://explorer-studio.genlayer.com/tx/0xb2012eb7335c6ee9c18c24d6e7045ffda84c68e2db0fe0570789015642d13040) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (b) tampered seal | [0x34dc4a70…](https://explorer-studio.genlayer.com/tx/0x34dc4a70db5177252cc481f9ce076ae4d40e35161c4adfd6920c023fe0b6ac28) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (b) tampered assessment | [0xb2db04c5…](https://explorer-studio.genlayer.com/tx/0xb2db04c574db87ce6f965297fe012e98ac798186a6d28936f9fdb6cf6d67a150) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (b) blocked publication | [0xf41976f1…](https://explorer-studio.genlayer.com/tx/0xf41976f12ab6231003e91d6f81d5ad11715de2611441a48787b785cf3c46fae3) | FINALIZED / MAJORITY_AGREE, contract_error exit_code 1 (NOT_ORDERABLE) |
| (c) unreachable seal | [0xd978f464…](https://explorer-studio.genlayer.com/tx/0xd978f464b0690027ab05b6725e0a623e0654bb444154b8883181f095c1ac77d5) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (c) unreachable assessment | [0x630891ef…](https://explorer-studio.genlayer.com/tx/0x630891ef47a4b3196621f6190e62f2099934b223ca81cbbf58c5b254e6be444f) | FINALIZED / MAJORITY_AGREE / SUCCESS (4th attempt; 3 prior MAJORITY_DISAGREE) |
| (c) blocked publication | [0x5a28eb30…](https://explorer-studio.genlayer.com/tx/0x5a28eb3017a57c0aa11dbbb3f54c106961b09ab1e30de9c8c337412bde62aacf) | FINALIZED / MAJORITY_AGREE, contract_error exit_code 1 (NOT_ORDERABLE) |
| (d) injection seal | [0x45c3466e…](https://explorer-studio.genlayer.com/tx/0x45c3466ee0b0103cf2858048f85b02605b99f0625fb40dbfad9f8bc28fbd5b34) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (d) injection assessment | [0x2a853d87…](https://explorer-studio.genlayer.com/tx/0x2a853d873eed1c65e9178e7b4633f1448f36f9090fe956f7cac60af549f8df99) | FINALIZED / MAJORITY_AGREE / SUCCESS (4th attempt; 3 prior MAJORITY_DISAGREE) |
| (d) blocked publication | [0x04eb9f5e…](https://explorer-studio.genlayer.com/tx/0x04eb9f5e2376a50588ee79d94c6a4627d9e40d515a667056db0398ff4a957c9d) | FINALIZED / MAJORITY_AGREE, contract_error exit_code 1 (NOT_ORDERABLE) |
| (e) no-URL seal | [0x5576ab81…](https://explorer-studio.genlayer.com/tx/0x5576ab81b1bcf1f5f2f3bf57e38ddc77576411b114ff79a828ea3c9ad93f1821) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (e) no-URL assessment | [0xc459c466…](https://explorer-studio.genlayer.com/tx/0xc459c466339de958ca44e5077a0cfe1d7f1f329fec404b7e7a766d16489fab1b) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (e) no-URL publication | [0xd4732f5d…](https://explorer-studio.genlayer.com/tx/0xd4732f5d2b2183b2efd8b6528efb6aaa35ce92260e8480c0e4aed5c3aed73912) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (f) regression seal | [0xd4dc5758…](https://explorer-studio.genlayer.com/tx/0xd4dc5758e4568cd836c08da1400aba57d1783d0a64e9df925770e18f3a437b56) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (f) regression assessment | [0xf031b8d5…](https://explorer-studio.genlayer.com/tx/0xf031b8d5406cd7bb5dfad49c89e6f5ad8c472fa82cc76f5e3e87773b92912268) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| (f) regression publication | [0xe2efc2a8…](https://explorer-studio.genlayer.com/tx/0xe2efc2a860c980254e3e22c32d383032b745229b540c87230726b2a0292dde88) | FINALIZED / MAJORITY_AGREE / SUCCESS |

Source-verification outcomes, each read back from a FINALIZED `get_review` (full receipts and readbacks in `evidence/source-*.json` and `evidence/regression-v2.json`):

- (a) Honest URL, sealed excerpt verbatim: `VERIFIED`, graph `ORDERABLE`, published S1–S5.
- (b) Same honest URL, sealed excerpt altered by one word inside a prerequisite sentence (`signed` → `countersigned`): `MISMATCH`, graph `REVIEW`, publish failed on-chain. A first variant that reversed the loan-agreement/transport prerequisite instead split consensus four times in a row (`MAJORITY_DISAGREE`, no review stored: `0x4432c07c…`, `0xdbb75c69…`, `0xc27546c5…`, `0xad104871…`), because the reversed sentence leaves the S1/S3 entailment ambiguous to the model validators; it was abandoned, and the one-word variant isolates the deterministic containment check. Its two sealed books remain unpublished and are not evidence.
- (c) Unreachable URL (HTTP 404): `UNREACHABLE`, graph `REVIEW`, publish failed on-chain. Assessment needed 4 attempts (3 `MAJORITY_DISAGREE` first: `0x4e3d99b3…`, `0xa9a21cc5…`, `0x8c7543f9…`).
- (d) Injection page (instructs `VERIFIED`, contains only a paraphrase): `MISMATCH`, graph `REVIEW`, publish failed on-chain. The page instruction did not change the outcome; disagreeing validators' own records show `MISMATCH` with `EXCERPT_ABSENT`. Assessment needed 4 attempts (3 `MAJORITY_DISAGREE` first: `0xec44e28d…`, `0xdfaff24c…`, `0xcdbd7705…`).
- (e) No URL (three-step tea procedure): `NOT_APPLICABLE`, graph `ORDERABLE`, published S1–S3.
- (f) Regression: the exact V1.1 five-step exhibition flow on V2 with no URL: `NOT_APPLICABLE`, graph `ORDERABLE`, published S1–S5.

The three blocked publications finalized with `MAJORITY_AGREE` and leader plus validator receipts `ERROR / contract_error / exit_code 1`: consensus agreed the call must raise, and the books stayed unpublished (`published: 0`, revision unchanged). `MAJORITY_DISAGREE` assessments stored no review; each was retried with the new expected revision and every attempt is recorded in its evidence file. The runner is `scripts/deploy-v2-evidence.mjs`.

## Browser transaction workflow

The actual application completed seal → assess → publish using a page-memory temporary Studio signer. The browser verified finalized majority acceptance, leader execution, exact binary calldata, sender, destination and stored state. The three-step catalogue example is authored test input, not a real publisher record.

| Operation | Transaction |
| --- | --- |
| frontend-seal | [0xeac13ee2…](https://explorer-studio.genlayer.com/tx/0xeac13ee2b8d547847ba74d9b608fd78d2613f61e1b1176e41df3d5c4073e8bbc) |
| frontend-assessment | [0x1fc34dad…](https://explorer-studio.genlayer.com/tx/0x1fc34dad223f068601920bda4eb7fc3cda1583a5eeddbfbee7eebfe73a1917e3) |
| frontend-publication | [0x6e52de8d…](https://explorer-studio.genlayer.com/tx/0x6e52de8d49b9355db73f90ad89f7901b918bff66c52ee9e38e1328f73c3b0b88) |

All three transactions finalized with majority acceptance and successful leader execution. Raw receipts preserve individual validator votes; majority acceptance does not imply unanimity. Injected-wallet signing and mobile-wallet flows are implemented but were not exercised in this cloud-browser check. The browser provided no WebGL context, so its visual check used the responsive vector fallback.
