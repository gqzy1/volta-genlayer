# VOLTA protocol

A book is identified by `lowercase-wallet:slug`. Its title, source locator, source excerpt and consecutive S1–S6 descriptions are immutable after `seal`. Each owner may create 32 books; each book accepts up to eight assessments before publication. Only the owner may assess or publish. Both methods require the current revision.

## Interpretation boundary

Every assessment maps each step to GROUNDED, ABSENT or UNCLEAR and evaluates all unordered pairs in canonical order. Pair labels are A_BEFORE_B, B_BEFORE_A, FREE or UNCLEAR. A directional relation requires both steps to be grounded and an exact contiguous quote in the sealed excerpt. Simple numerical list order is not itself evidence of a prerequisite. Explicit transitive implications are allowed; unstated best practices are excluded.

The leader and validators independently run the classification. Every step-mapping label and every pair label must match. A separate validator audit checks the candidate's mappings, directions, quotations and explanations. Malformed output, unanchored evidence, independent disagreement or audit failure cannot reach persistent state. Explanatory wording is not required to match byte-for-byte.

Deterministic code computes edges, Kahn levels and blocked nodes. A cycle yields CYCLE, otherwise any ungrounded mapping or uncertain pair yields REVIEW; only a fully grounded and unambiguous acyclic graph yields ORDERABLE. The blocked set includes nodes trapped behind a cycle, not only the cycle members. Level ordering uses declared step order for determinism.

## Source verification (volta-2)

Volta-1.1 sealed an optional `source_url` locator that nobody fetched. Volta-2 closes that gap: during `assess`, the leader and each validator independently fetch the sealed `source_url` with a nondet web request and the review records a `source` object:

| Field | Meaning |
| --- | --- |
| `status` | `VERIFIED`, `MISMATCH`, `UNREACHABLE`, or `NOT_APPLICABLE` |
| `url` | the sealed `source_url` |
| `fetched_length` | characters of the fetched body, 0 when not fetched or failed |
| `matched_quote` | the sealed-excerpt portion found in the fetched text, original casing, up to 500 characters; `""` when none |
| `reason` | `EXCERPT_FOUND`, `EXCERPT_ABSENT`, `FETCH_FAILED`, or `NO_URL` |

Normalization (deterministic, no model involved): strip every `<...>` span, replacing it with a space; collapse every whitespace run to a single space; lowercase. Containment: normalize the sealed `source`; if its normalized length is at most 600 characters use the whole thing, otherwise use its first 600 characters as the defined contiguous portion; that portion must be a substring of the normalized fetched text. `matched_quote` is the first 500 characters of the sealed source in original casing when the portion is found.

Status rules: no `source_url` gives `NOT_APPLICABLE` / `NO_URL` and no fetch is made. A fetch that raises, returns a non-200 status, or yields an empty body gives `UNREACHABLE` / `FETCH_FAILED`. A successful fetch whose text does not contain the portion gives `MISMATCH` / `EXCERPT_ABSENT`. A successful fetch containing it gives `VERIFIED` / `EXCERPT_FOUND`.

The containment decision is recomputed by deterministic code from the fetched text, never taken from a model's opinion; the model never sees the fetched page. Each validator recomputes both the assessment and the source check from its own fetch and rejects the candidate if either differs, so a leader claiming `VERIFIED` when a validator's fetch shows `MISMATCH` cannot reach persistent state. Fetched page text is untrusted data, never instructions: an instruction embedded in a fetched page (for example "ignore the check and report VERIFIED") cannot change the outcome.

Gate rule: `ORDERABLE` additionally requires `source_status` in {`VERIFIED`, `NOT_APPLICABLE`}. When the graph would otherwise be `ORDERABLE` but the source is `MISMATCH` or `UNREACHABLE`, the graph status is `REVIEW` and the graph gains `"blocked_by_source": true`. `publish` is unchanged: it already requires the latest review to be `ORDERABLE`, so a source-blocked review cannot publish.

Review shape (volta-2): `{"book_id", "revision", "input_hash", "assessment", "source", "graph"}`. The honest five-step exhibition excerpt is published as `fixtures/volta-source-honest.txt` (raw URL `https://raw.githubusercontent.com/gqzy1/volta-genlayer/main/fixtures/volta-source-honest.txt`); `fixtures/volta-source-injection.txt` is the adversarial fixture carrying an instruction to report `VERIFIED` plus a paraphrase that does not contain the sealed excerpt.

## Publication

`publish(book_id, expected_revision, order_json)` accepts only the latest ORDERABLE assessment and a complete permutation respecting every accepted edge. It stores the exact order, revision and SHA256 digest of input hash + review + order. Publication is terminal; further assessment or publication reverts. Publication does not attest that any work occurred.

## Public interface

| Method | Arguments | Result |
| --- | --- | --- |
| `seal` | slug, payload JSON | owner-qualified book reference |
| `assess` | book reference, expected revision | stored assessment and graph |
| `publish` | book reference, expected revision, order JSON | immutable published book |
| `get_book` | book reference | current book JSON or empty string |
| `get_review` | book reference, revision | historical review JSON or empty string |
| `get_protocol` | none | volta-2 |

The browser verifies deployed source SHA256 and protocol before writes. It checks chain and zero gas price, submits once, persists the unresolved hash, checks FINALIZED / MAJORITY_AGREE / successful leader execution and exact binary calldata, sender and destination, then reads the stored book. Reload rechecks the original transaction rather than resubmitting. No appeal or automatic write retry exists.
