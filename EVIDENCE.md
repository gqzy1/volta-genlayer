# Network evidence

Stable GenLayer Studionet, chain ID 61999, official RPC `https://studio.genlayer.com/api`. The active deployment and example are recorded in `public/deployment.json`. Raw receipts and finalized readbacks are in `evidence/`.

Local deterministic checks comprise ten JavaScript tests and seven mocked-host contract tests. The latter do not prove network consensus. The official schema endpoint validates the pinned contract ABI before deployment.

## Historical V1

The first source deployed successfully at `0xb27425eCc16F989767Ee166dE3560AbE87cA14D7`. Its source sealing succeeded. Assessment transaction `0x9020dc02e2a4c3231ddd0f6c4a1df3c264aee2177e5e0ccd5c2bc239f2cd41d5` finalized with majority disagreement and a leader `MAPPING_SIZE` exception. It did not create an accepted review. These records are retained in `evidence/historical-v1/` and are not evidence of a successful assessment.

The V1.1 source adds an explicit full output shape and deterministic normalization for an exact step-ID keyed mapping. It preserves all semantic equivalence and quote-grounding checks. The failed transaction is not retried or appealed; V1.1 uses a distinct deployment.
