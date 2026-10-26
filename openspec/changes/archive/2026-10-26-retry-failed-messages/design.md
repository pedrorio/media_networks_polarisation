# Design

## Context

See proposal.md. kafkajs 1.12 commits resolved offsets at the end of a fetch, retries the fetch 10 times, then restarts on `KafkaJSNumberOfRetriesExceeded`. Cross-group keys return normally and must stay that way because both groups read both topics.

## Goals / Non-Goals

**Goals:**

- A failing owned message is attempted a fixed number of times, then parked, and the partition moves on.
- The dead-letter record is enough to replay the message later by hand.

**Non-Goals:**

- Changing the shared-topic layout.
- Idempotent database writes (separate change).
- Implementing the change in this pull request.

## Decisions

- Retry budget is 5 handler attempts, then one dead-letter produce, then commit. Five is large enough to ride out a blip and small enough to test with a stub broker.
- The dead-letter topic is a single topic, `CRAWL_DEAD_LETTER`, with the original topic stored in the payload. Alternative considered: one dead-letter topic per outlet. Rejected because operators would have two queues to read for the same failure class.
- Dead-letter produce uses the same acks default. If that produce fails, the offset stays uncommitted so the message is not lost.

## Risks / Trade-offs

- [A bug that throws on every valid message fills the dead-letter topic] → the budget is finite, so the partition still moves and the dead-letter depth is the alert.
- [Cross-group messages must not be dead-lettered] → handlers keep the current default branch for keys they do not own.

## Migration Plan

- Create the dead-letter topic before rolling the new consumer. Old consumers ignore unknown topics. Rollback is redeploying the current images; parked records stay on the dead-letter topic for a later replay.

## Open Questions

- None that change the requirements. The topic name can move in implementation as long as there is exactly one dead-letter destination.
