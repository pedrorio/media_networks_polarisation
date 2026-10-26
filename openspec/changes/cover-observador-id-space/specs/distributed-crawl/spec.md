# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Id batches neither cover nor cap the id space`
- TO: `### Requirement: Id batches cover every id up to the newest`

## MODIFIED Requirements

### Requirement: Id batches cover every id up to the newest
The manager SHALL enqueue FILTER_ARTICLES batches that together contain every integer from 1 through the most recent Observador id, inclusive, with at most 1000 ids in each batch and no gaps or duplicates.

#### Scenario: Id 10 split by 4
- **WHEN** the most recent id is 10 and the batch size is 4
- **THEN** the batches are [1, 2, 3, 4], [5, 6, 7, 8], and [9, 10]

#### Scenario: Id 2500 split by 1000
- **WHEN** the most recent id is 2500 and the batch size is 1000
- **THEN** the batches cover every id from 1 through 2500 once
- **AND** no batch holds more than 1000 ids
