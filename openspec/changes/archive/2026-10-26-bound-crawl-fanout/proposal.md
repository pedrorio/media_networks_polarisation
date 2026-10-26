# Proposal

## Why

The manager sends every Público article fetch and every Observador id batch in one producer call. Observador ids run into the hundreds of thousands, and nothing pauses the consumer or limits in-flight work. Workers cannot slow the producer down. That is unbounded fan-out, not backpressure.

## What Changes

- Cap how many retrieve and filter messages may be outstanding.
- Send further batches only as earlier ones complete.
- Keep the id-splitting math for a separate change. This change only bounds the send.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `distributed-crawl`: The unbounded send becomes a capped, completion-paced send.

## Impact

- `retrievedPageData.ts` and `retrievedMostRecentArticleData.ts`.
- A counter or lag check in the manager. Workers stay request/response processes.
