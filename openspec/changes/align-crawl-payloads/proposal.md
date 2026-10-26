# Proposal

## Why

The worker publishes one PAGE_DATA message per Público article, but the manager maps `JSON.parse` of that value as an array, so a single object throws and no article fetch is enqueued. The manager then publishes the article JSON under RETRIEVE_ARTICLE, and the worker runs `parseInt` on it, which is NaN, so the article URL is never requested. The two sides of each hop do not agree on the payload.

## What Changes

- The worker publishes one PAGE_DATA message whose value is the JSON array of articles on that page.
- The worker article handler reads the article URL from the JSON object the manager already sends, and fetches that URL.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `distributed-crawl`: Page and article payload shapes the worker sends and reads.

## Impact

- `retrievePage.ts` and `retrieveArticle.ts`.
- The manager array handler stays, because it already specifies the array shape.
