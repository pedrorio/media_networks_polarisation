# Design

## Context

See proposal.md. `retrievePage` maps each article to its own message. `retrievedPageData` expects an array. `retrieveArticle` uses `parseInt(message.value)`.

## Goals / Non-Goals

**Goals:**

- A page message is one JSON array, which the existing manager handler can map.
- An article message carries the URL the fetcher needs.

**Non-Goals:**

- Deduplicating titles. That stays in the idempotent-write change.
- The Observador batch shape.
- Implementing this in the current pull request.

## Decisions

- Keep the manager's array contract and change the worker to match it. Alternative considered: change the manager to accept one object. Rejected because the manager also filters the whole page in one query; one message per page preserves that.
- The article payload stays the JSON object already built in `retrievedPageData`. The worker reads `url` from it. The list endpoint provides `url`; the body is filled by the article fetch.

## Risks / Trade-offs

- [A page array can be large] → Público list pages are small. The backpressure change caps how many of those messages are in flight.
- [Old in-flight per-article PAGE_DATA messages still throw] → drain or skip non-array values once, and dead-letter them when that change lands. This change's requirement is the new shape.

## Migration Plan

- Deploy workers and the manager together. Rollback restores both sides, since neither old side matches the new side.

## Open Questions

- None.
