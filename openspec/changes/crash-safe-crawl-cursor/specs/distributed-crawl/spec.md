# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Kill mid-handler does not roll back side effects`
- TO: `### Requirement: Redelivery after a crash does not duplicate work`
- FROM: `### Requirement: Manager restart appends new seeds`
- TO: `### Requirement: Manager restart resumes the crawl cursor`

## MODIFIED Requirements

### Requirement: Redelivery after a crash does not duplicate work
If the process is killed inside a handler, Kafka MAY deliver the uncommitted message again. A replay SHALL NOT append a second result for the same work identity and SHALL NOT leave the system to a manual rollback. Safety SHALL come from idempotent follow-up produces, not from a transaction that covers Kafka and Postgres.

#### Scenario: Worker dies after producing a reply
- **WHEN** the worker has sent a result and is then killed before the offset commit
- **THEN** the work message may be delivered again
- **AND** the result topic contains one result for that work identity

#### Scenario: Manager dies after a database save
- **WHEN** the manager has saved a row and is killed before the offset commit
- **THEN** the result message may be delivered again
- **AND** the article row count for that source id stays one

### Requirement: Manager restart resumes the crawl cursor
The manager SHALL store the next Público page and the Observador batches not yet finished. A later process start SHALL resume that cursor. It SHALL NOT append another page-1 seed or another most-recent seed while the cursor is unfinished.

#### Scenario: Manager pod restarts
- **WHEN** the manager container starts again during a Público crawl that has passed page 1
- **THEN** it does not append another page-1 seed
- **AND** the next page it enqueues is the stored cursor
