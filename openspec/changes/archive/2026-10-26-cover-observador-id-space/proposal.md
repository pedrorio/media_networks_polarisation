# Proposal

## Why

`getArticleIdBatches` is called with 1000 as if that were a batch size. The slice width is `length / multiple`, truncated, and the batch count is `ceil(id / multiple) + 1`. For id 2500 and multiple 1000 the only ids enqueued are 1 through 10. The call site therefore never requests the rest of the Observador id space.

## What Changes

- Cover every id from 1 through the most recent id, inclusive.
- Each batch holds at most the requested size, with no gaps and no duplicate ids.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `article-transform`: The pure batch function's results.
- `distributed-crawl`: The crawl uses that same coverage rule. The requirement that names the old formula is replaced.

## Impact

- `loader/utils/observador/filterArticles.ts`, function `getArticleIdBatches`.
- The manager call site can keep passing 1000, which then means 1000 ids per batch.
- The golden test for the old formula is updated when this is implemented, not before.
