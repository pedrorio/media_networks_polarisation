# Proposal

## Why

Killing a worker or the manager mid-handler leaves the offset uncommitted, so the message is delivered again, while HTTP calls and follow-up produces already happened and are not rolled back. Starting the manager again always appends a new Público page-1 seed and a new Observador seed on top of any crawl still in the log. There is no cursor to resume from.

## What Changes

- Persist a crawl cursor per outlet: the next Público page, and the Observador batches not yet acknowledged.
- A manager start resumes that cursor and does not append another seed while the cursor is unfinished.
- Redelivery of a work item does not append a second result message for the same work identity.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `distributed-crawl`: Crash and restart behaviour of the manager seed and of in-flight work.

## Impact

- `loader/microservices/manager/index.ts` and the handlers that enqueue the next page or batch.
- A small cursor store (Postgres or a compacted topic). No change to jq scripts.
