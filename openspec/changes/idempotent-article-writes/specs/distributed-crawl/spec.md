# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: No idempotency key`
- TO: `### Requirement: Article writes are idempotent on source identity`
- FROM: `### Requirement: Observador saves only when the title query is falsy`
- TO: `### Requirement: Observador articles save when the source id is new`
- FROM: `### Requirement: Público title filter runs only before the article fetch`
- TO: `### Requirement: Público saves are safe to repeat`
- FROM: `### Requirement: Newspaper link is hardcoded to Observador`
- TO: `### Requirement: Articles keep the newspaper named by the transform`

## MODIFIED Requirements

### Requirement: Article writes are idempotent on source identity
Each produced article message SHALL carry the outlet and the source article id. A second delivery of the same pair SHALL NOT insert another article row. Title SHALL NOT be the idempotency key.

#### Scenario: Same record delivered twice
- **WHEN** the same outlet and source article id are handled twice
- **THEN** the article table contains one row for that pair
- **AND** follow-up produces from the first attempt are not recalled

### Requirement: Observador articles save when the source id is new
The filtered-article handler and the sequential Observador script SHALL treat an empty title lookup as missing. They SHALL insert when the outlet and source id are not stored, and SHALL NOT insert when that pair is already stored.

#### Scenario: No stored article
- **WHEN** the lookup for that Observador source id finds no row
- **THEN** the handler saves one article

#### Scenario: Title already stored
- **WHEN** the same Observador source id is already stored
- **THEN** the handler does not insert a second row
- **AND** a different source id is not skipped merely because the title string matches

### Requirement: Público saves are safe to repeat
The page handler MAY still skip titles already stored. The article save SHALL also be idempotent on outlet plus source id. A unique violation SHALL be treated as the row already existing, not as a crash.

#### Scenario: Duplicate title on the page
- **WHEN** a page contains a source id that is already stored
- **THEN** no second article row is created for that source id

#### Scenario: Redelivered article save
- **WHEN** ARTICLE_DATA is handled twice for one Público source id
- **THEN** the article table contains one row
- **AND** the second save does not surface as an unhandled unique violation

### Requirement: Articles keep the newspaper named by the transform
The save path SHALL look up the newspaper named on the transformed article. A missing newspaper SHALL be inserted as a newspaper row with that name and then linked. The path SHALL NOT query only OBSERVADOR and SHALL NOT pass the article object to the newspaper repository.

#### Scenario: Observador row missing
- **WHEN** the article names PUBLICO and no PUBLICO newspaper row exists
- **THEN** a PUBLICO newspaper row is inserted and linked
- **AND** the article is not saved through the newspaper repository

#### Scenario: Observador row exists
- **WHEN** the article names PUBLICO and an OBSERVADOR newspaper row also exists
- **THEN** the article's newspaper is the PUBLICO row

## ADDED Requirements

### Requirement: Saved rows keep transformed fields
The object passed to the article repository SHALL include the transformed title, text, date, tags, authors, and newspaper name. `excludeExtraneousValues` SHALL NOT drop those fields.

#### Scenario: Público transform round-trip
- **WHEN** a transformed Público article is converted for save
- **THEN** title, text, date, tag names, author names, and newspaper name are still set
