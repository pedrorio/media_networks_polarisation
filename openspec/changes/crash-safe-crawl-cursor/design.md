# Design

## Context

See proposal.md. Seeds are sent unconditionally at the top of `run` in the manager. Offsets commit only after the fetch loop, so a kill in the handler redelivers.

## Goals / Non-Goals

**Goals:**

- Restart continues a crawl instead of starting another one at page 1.
- A redelivered work item has one result.

**Non-Goals:**

- Exactly-once transactions via Kafka transactions.
- The dead-letter policy, which is a separate change.
- Implementing this in the current pull request.

## Decisions

- Cursor rows live in Postgres next to the articles: outlet, next page or batch id, updated in the same database transaction as the article save. Alternative considered: a compacted Kafka topic. Rejected because the cluster already fails to start a database and adding a second log does not make the cursor easier to test.
- Result messages use a key of outlet plus work identity (page number, or source article id). The producer enablement of idempotence is optional; the requirement is one result, which a key plus a check-before-send satisfies.

## Risks / Trade-offs

- [Cursor update succeeds and the process dies before the Kafka commit] → redelivery sees the cursor and the saved row and skips. That is the intended window.
- [Two manager replicas] → out of scope. The manifest stays at one replica until a later change.

## Migration Plan

- Deploy the cursor table before the new manager. Old manager ignores it. Rollback redeploys the old manager; the extra seeds return, and the cursor table is unused.

## Open Questions

- None.
