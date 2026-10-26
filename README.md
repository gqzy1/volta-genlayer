# VOLTA

**The architecture of what comes next.**

VOLTA is a GenLayer application for inspecting the prerequisite order of a procedure. Seal a source excerpt and 2–6 steps, inspect an independently validated relation matrix, arrange a sequence, and publish an immutable order only when every accepted prerequisite is respected.

[Open the application](https://gqzy1.github.io/volta-genlayer/) · [Protocol](PROTOCOL.md) · [Demo](DEMO.md) · [Contract](contracts/volta.py) · [Network evidence](EVIDENCE.md)

## Why this exists

A numbered list is not necessarily a dependency graph. Two actions may run in either order; another may require a signed agreement first. A general text-generation answer gives collaborators no shared acceptance record. VOLTA fixes the exact source and steps, independently interprets all step mappings and pairwise relationships through GenLayer, then applies deterministic graph and publication rules.

The interface uses monumental marble sculpture, a Renaissance-inspired illustrated hall, expressive typography, and an interactive arch. Moving a step ahead of its prerequisite visibly weakens the structure. WebGL devices receive a Three.js scene; other devices receive a responsive vector arch with the same feedback. Practice uses authored relationships, explicitly labelled offline.

## Use it

1. Try **Practice** without a wallet. Move “Open the exhibition” above “Install the sculptures”; inspect the violated relationship and source quotation.
2. In **On chain**, enter a procedure excerpt, optional source locator and 2–6 distinct steps. Connect an injected wallet or create a zero-gas temporary Studio session.
3. **Seal this procedure** fixes the text and its SHA256 commitment. **Interpret prerequisites** requests independent consensus. Each accepted review remains readable.
4. Inspect GROUNDED / ABSENT / UNCLEAR step mappings and all pairwise relations. A cycle or any uncertainty blocks publication.
5. Reorder the steps, then **Publish this order**. The contract enforces a full permutation and every directional constraint. Publication freezes the record and creates a certificate digest.
6. Read a book by its owner-qualified reference without signing, or export its readback and transaction receipt.

A temporary Studio signing key exists only in the current page's memory. Reloading loses signing access; the public book remains readable. Never transfer funds to a temporary address. The application uses no paid inference API or application backend.

## Run locally

Node.js 22+ and Python 3.11+:

```sh
npm ci
npm test
python -m unittest discover -s contract-tests -v
npm run dev
```

`npm run build` creates a portable static `dist/` for subdirectory hosting. The Pages workflow checks and publishes pushes to `main`. `genlayer-js` is pinned to 1.1.8. Stable Studionet 61999 at `https://studio.genlayer.com/api` is the only configured chain; writes require zero gas price, zero value and full consensus.

## Boundaries

The source is a **user-supplied excerpt**. Its optional URL is a locator; VOLTA does not authenticate the publisher or fetch that URL. The result describes explicit prerequisite constraints in that excerpt. FREE means the excerpt imposes no relative order, not that two real operations are safe to run concurrently. Missing material can omit necessary constraints. Consensus can contain correlated semantic errors.

VOLTA does not execute work, verify completion, certify safety, or provide operational authorization. All sealed content is public. Use non-sensitive material. The included exhibition procedure is an authored illustrative example, not a real museum's operational record.

## Source map

| Path | Purpose |
| --- | --- |
| `src/main.js`, `src/style.css` | Complete application and responsive design |
| `src/sculpture.js` | Interactive WebGL arch and vector fallback |
| `src/network.js`, `src/receipts.js` | Wallet sessions, source identity, exact transaction intent and finality verification |
| `contracts/volta.py` | Complete deployed Intelligent Contract |
| `public/deployment.json` | Chain identity, deployed source digest and recorded example |
| `evidence/` | Real network receipts and readbacks |
| `tests/`, `contract-tests/` | Deterministic model, receipt and mocked-host state tests |

MIT licensed. The hero is an original generated Renaissance-inspired illustration, not a reproduction of a Michelangelo work. The product does not imply affiliation with a museum or artist's estate.
