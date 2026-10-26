# Design

## Context

See proposal.md. `divideArticleIdsInBatches` slices with floating bounds and `range` is exclusive of the end.

## Goals / Non-Goals

**Goals:**

- A pure function whose output for `(10, 4)` is the three batches in the scenario, including 10.

**Non-Goals:**

- Pacing those batches onto Kafka. That is the backpressure change.
- Implementing this in the current pull request.

## Decisions

- Build ids as a half-open loop from 1 to mostRecent inclusive, chunked by `multiple`. Alternative considered: fix only the slice arithmetic and still call `range(1, id)`. Rejected because `range` omits the end, so the newest article would still be missing.

## Risks / Trade-offs

- [The corrected function requests many more ids] → that is the crawl the call site already asked for. The backpressure change caps how fast those batches are sent.

## Migration Plan

- Replace the function and update the golden fixture in the same implementation change. No stored data depends on the old gaps.

## Open Questions

- None.
