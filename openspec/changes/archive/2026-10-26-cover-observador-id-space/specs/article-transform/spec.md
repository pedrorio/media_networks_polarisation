# Spec Delta

## ADDED Requirements

### Requirement: Id batches cover the inclusive range
getArticleIdBatches SHALL split every integer from 1 through the most recent id, inclusive, into contiguous batches of at most `multiple` ids. Each id SHALL appear once. There SHALL be no gaps. `multiple` SHALL be the maximum batch length.

#### Scenario: Id 10 split by 4
- **WHEN** the most recent id is 10 and multiple is 4
- **THEN** the batches are [1, 2, 3, 4], [5, 6, 7, 8], and [9, 10]

#### Scenario: Id 2500 split by 1000
- **WHEN** the most recent id is 2500 and multiple is 1000
- **THEN** every id from 1 through 2500 appears once
- **AND** no batch holds more than 1000 ids
