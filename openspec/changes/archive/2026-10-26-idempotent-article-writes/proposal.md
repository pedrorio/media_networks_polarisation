# Proposal

## Why

Redelivery runs the handler again, and nothing on the message identifies the article. Observador saves are skipped because `find` returns an array, which is always truthy. Público checks the title only before the fetch. Newspaper lookup always uses OBSERVADOR, and `toArticle` drops fields that are not `@Expose`d. A replay can drop a row, duplicate one, or store it under the wrong outlet.

## What Changes

- Identity for a stored article is the outlet plus the source article id, not the title.
- An empty title lookup saves the article. A second delivery of the same source id does not insert another row.
- The newspaper row is the one named on the transformed article.
- The entity passed to the repository keeps title, text, date, tags, authors, and newspaper.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `distributed-crawl`: Idempotent saves, a real missing-row check, and the newspaper the transform named.

## Impact

- `filteredArticleData.ts`, `retrievedArticleData.ts`, `addUniqueNewspaper.ts`, `article.dto.ts`, and the Observador sequential script, which shares the truthy-array check.
- Article table needs a unique key on outlet and source id. Title uniqueness is not that key.
