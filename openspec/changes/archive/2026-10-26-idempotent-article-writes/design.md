# Design

## Context

See proposal.md. `ArticleDTO.toArticle` uses `excludeExtraneousValues: true` and the entity fields have no `@Expose`. `repository.find` returns an array. `addUniqueNewspaper` queries `OBSERVADOR` only.

## Goals / Non-Goals

**Goals:**

- One row per outlet plus source article id.
- The saved row contains the transformed fields and the newspaper the transform named.

**Non-Goals:**

- Rewriting the Kafka retry policy.
- Changing the jq file-ETL schema.
- Implementing this in the current pull request.

## Decisions

- Idempotency key is `{newspaper, sourceArticleId}` stored on the article. Title stays a column and loses the role of primary dedup key. Alternative considered: keep the unique title index as the only key. Rejected because two outlets can share a headline and the Observador path already fails closed on any array.
- Empty lookup means "not found". Implementation should use a count or `findOne`, not a truthiness check on an array.
- Field retention is `@Expose` on the mapped columns or turning off `excludeExtraneousValues`. Either satisfies the scenario. Prefer `@Expose` so stray HTTP fields are still dropped.

## Risks / Trade-offs

- [Existing rows have no source id] → migration backfills what it can and leaves old title-only rows out of the new unique key until a re-crawl.
- [Title collisions that the old unique index rejected will now insert] → that is the point of the new key; the migration drops the title unique index only after the new unique index exists.

## Migration Plan

- Add nullable source id, backfill, then enforce the unique pair. Rollback keeps the new columns and redeploys the old code, which ignores them.

## Open Questions

- None. The source id is the `id` already present on both outlets' payloads.
