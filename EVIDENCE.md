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

## Browser transaction workflow

The actual application completed seal → assess → publish using a page-memory temporary Studio signer. The browser verified finalized majority acceptance, leader execution, exact binary calldata, sender, destination and stored state. The three-step catalogue example is authored test input, not a real publisher record.

| Operation | Transaction |
| --- | --- |
| frontend-seal | [0xeac13ee2…](https://explorer-studio.genlayer.com/tx/0xeac13ee2b8d547847ba74d9b608fd78d2613f61e1b1176e41df3d5c4073e8bbc) |
| frontend-assessment | [0x1fc34dad…](https://explorer-studio.genlayer.com/tx/0x1fc34dad223f068601920bda4eb7fc3cda1583a5eeddbfbee7eebfe73a1917e3) |
| frontend-publication | [0x6e52de8d…](https://explorer-studio.genlayer.com/tx/0x6e52de8d49b9355db73f90ad89f7901b918bff66c52ee9e38e1328f73c3b0b88) |

All three transactions finalized with majority acceptance and successful leader execution. Raw receipts preserve individual validator votes; majority acceptance does not imply unanimity. Injected-wallet signing and mobile-wallet flows are implemented but were not exercised in this cloud-browser check. The browser provided no WebGL context, so its visual check used the responsive vector fallback.
