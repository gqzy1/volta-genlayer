# VOLTA protocol

A book is identified by `lowercase-wallet:slug`. Its title, source locator, source excerpt and consecutive S1–S6 descriptions are immutable after `seal`. Each owner may create 32 books; each book accepts up to eight assessments before publication. Only the owner may assess or publish. Both methods require the current revision.

## Interpretation boundary

Every assessment maps each step to GROUNDED, ABSENT or UNCLEAR and evaluates all unordered pairs in canonical order. Pair labels are A_BEFORE_B, B_BEFORE_A, FREE or UNCLEAR. A directional relation requires both steps to be grounded and an exact contiguous quote in the sealed excerpt. Simple numerical list order is not itself evidence of a prerequisite. Explicit transitive implications are allowed; unstated best practices are excluded.

The leader and validators independently run the classification. Every step-mapping label and every pair label must match. A separate validator audit checks the candidate's mappings, directions, quotations and explanations. Malformed output, unanchored evidence, independent disagreement or audit failure cannot reach persistent state. Explanatory wording is not required to match byte-for-byte.

Deterministic code computes edges, Kahn levels and blocked nodes. A cycle yields CYCLE, otherwise any ungrounded mapping or uncertain pair yields REVIEW; only a fully grounded and unambiguous acyclic graph yields ORDERABLE. The blocked set includes nodes trapped behind a cycle, not only the cycle members. Level ordering uses declared step order for determinism.

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
| `get_protocol` | none | volta-1.1 |

The browser verifies deployed source SHA256 and protocol before writes. It checks chain and zero gas price, submits once, persists the unresolved hash, checks FINALIZED / MAJORITY_AGREE / successful leader execution and exact binary calldata, sender and destination, then reads the stored book. Reload rechecks the original transaction rather than resubmitting. No appeal or automatic write retry exists.
