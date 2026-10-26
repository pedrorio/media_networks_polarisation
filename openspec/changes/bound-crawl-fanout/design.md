# Design

## Context

See proposal.md. Both fan-out sites build a `messages` array and call `producer.send` once.

## Goals / Non-Goals

**Goals:**

- A configurable cap on outstanding work, with a test that a crawl larger than the cap does not send it all at once.

**Non-Goals:**

- Fixing which ids are inside a batch.
- Broker quotas or Kafka quotas. The cap is in the manager.
- Implementing this in the current pull request.

## Decisions

- Default cap is 32 outstanding messages per outlet, passed as an environment variable so a test can set it to 2. Alternative considered: pause the consumer when lag exceeds a threshold. Rejected because lag is per partition and both roles share the partition, so lag mixes result messages with work messages.

## Risks / Trade-offs

- [Cap too low slows the crawl] → 32 is a starting default, and the requirement is the existence of a cap, not that number. The scenario uses "the cap", not 32.
- [Completion is only known when the result comes back] → the manager counts FILTER_ARTICLES and RETRIEVE_ARTICLE until the matching result key arrives.

## Migration Plan

- Rolling the manager is enough. In-flight uncapped sends from an old process drain on their own. Rollback restores the single send.

## Open Questions

- None.
