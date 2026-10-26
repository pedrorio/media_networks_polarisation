# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: No bound on outstanding crawl work`
- TO: `### Requirement: Outstanding crawl work is bounded`

## MODIFIED Requirements

### Requirement: Outstanding crawl work is bounded
The manager SHALL keep outstanding RETRIEVE_ARTICLE and FILTER_ARTICLES messages at or below a configured cap. It SHALL send more only as earlier messages of that kind are completed. It SHALL NOT put an entire crawl into one producer call.

#### Scenario: Large Observador id
- **WHEN** batch splitting returns more batches than the cap
- **THEN** the first send contains at most the cap
- **AND** further batches are sent only as earlier batches complete

### Requirement: Observador crawl fans out the current id batches
The worker SHALL ignore the seed value, fetch the Observador widget, and reply with the most recent article JSON under key MOST_RECENT_ARTICLE_DATA. The manager SHALL split that id with getArticleIdBatches using multiple 1000 and SHALL send FILTER_ARTICLES messages under the outstanding-work cap. The worker SHALL POST each received batch to the Observador fetchbulk endpoint and SHALL emit one FILTERED_ARTICLE_DATA message per returned article.

#### Scenario: Widget reply
- **WHEN** the manager receives MOST_RECENT_ARTICLE_DATA
- **THEN** it produces FILTER_ARTICLES messages only up to the outstanding-work cap
- **AND** it waits for completions before sending the rest
