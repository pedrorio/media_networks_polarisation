# Article transform

## Purpose

Field mapping of the pure Público and Observador transform functions, which do not contact the network. The file-ETL jq filters are specified separately and do not share this shape.

## Requirements

### Requirement: Público transform copies text authors and the name tag field
Publico.transformArticle SHALL set title from titulo, date from data, text from texto, and newspaper name PUBLICO. Authors SHALL be kept only when contribuicao is Texto, Textos, texto, or textos, and SHALL be copied from nome. Tags SHALL be copied from name. A tag that only has nome SHALL NOT contribute a tag name.

#### Scenario: Mixed author credits
- **WHEN** authors include contribuicao Texto and contribuicao Fotografia
- **THEN** the result authors contain the Texto author
- **AND** the Fotografia author is absent

#### Scenario: Tag carries nome and not name
- **WHEN** a tag object has nome and no name
- **THEN** the copied tag has no name

#### Scenario: Tag carries name
- **WHEN** a tag object has name Politica
- **THEN** the copied tag name is Politica

### Requirement: Observador single-article transform keeps creditType containing text
Observador.transformArticle SHALL set title from fullTitle, date from pubDate, text from body, and newspaper name OBSERVADOR. Tags SHALL be copied from metadata.topics name. Authors SHALL be kept only when creditType.includes("text") is true, and SHALL be copied from name. An array creditType SHALL match the element "text" exactly.

#### Scenario: Photo credit dropped
- **WHEN** one author has creditType ["photo"] and another has creditType ["text"]
- **THEN** only the text author is copied

#### Scenario: Array element must be text
- **WHEN** an author has creditType ["textbook"]
- **THEN** that author is not copied

### Requirement: Observador bulk transform keeps every text credit
Observador.transformArticleBulk SHALL set title from title, date from date.datetime, text from content, and newspaper name OBSERVADOR. Tags SHALL be copied from categories name. Every textCredits entry SHALL become an author named user.displayName, with no credit filter.

#### Scenario: Two credits
- **WHEN** textCredits has two users
- **THEN** the result has both display names
- **AND** neither is dropped for a credit type

### Requirement: Range includes both ends
range(start, end) SHALL yield every integer from start through end, inclusive, walking upward or downward. When start equals end it SHALL yield that single value. The walk stops once the bound has been stepped onto the end, and the equality branch then yields that end value.

#### Scenario: Equal bounds
- **WHEN** range is called with 3 and 3
- **THEN** the only yielded value is 3

#### Scenario: Ascending bounds
- **WHEN** range is called with 1 and 4
- **THEN** the yielded values are 1, 2, 3, and 4

#### Scenario: Descending bounds
- **WHEN** range is called with 5 and 2
- **THEN** the yielded values are 5, 4, 3, and 2

### Requirement: Id batches cover the inclusive range
getArticleIdBatches SHALL split every integer from 1 through the most recent id, inclusive, into contiguous batches of at most `multiple` ids. Each id SHALL appear once. There SHALL be no gaps. `multiple` SHALL be the maximum batch length.

#### Scenario: Id 10 split by 4
- **WHEN** the most recent id is 10 and multiple is 4
- **THEN** the batches are [1, 2, 3, 4], [5, 6, 7, 8], and [9, 10]

#### Scenario: Id 2500 split by 1000
- **WHEN** the most recent id is 2500 and multiple is 1000
- **THEN** every id from 1 through 2500 appears once
- **AND** no batch holds more than 1000 ids
