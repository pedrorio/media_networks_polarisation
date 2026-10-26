# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Handler failures are retried then the consumer restarts`
- TO: `### Requirement: Failed handlers retry then dead-letter`
- FROM: `### Requirement: No dead-letter topic`
- TO: `### Requirement: Poison messages are dead-lettered`

## MODIFIED Requirements

### Requirement: Failed handlers retry then dead-letter
A handler that throws SHALL be retried at most 5 times for that delivery cycle. The failed offset SHALL stay uncommitted until the budget is spent. The consumer SHALL NOT use an uncapped restart loop as the retry policy.

#### Scenario: Handler throws
- **WHEN** eachMessage throws a non-KafkaJS error
- **THEN** the failed offset stays uncommitted
- **AND** earlier resolved offsets in that fetch are committed
- **AND** the same message is attempted again until the budget is spent

#### Scenario: Retries exhausted
- **WHEN** the fifth attempt still throws
- **THEN** one dead-letter record is appended with the original topic, key, value, and error text
- **AND** the original offset is committed
- **AND** the consumer does not restart onto that message

### Requirement: Poison messages are dead-lettered
The application SHALL declare a dead-letter topic. A message that fails past the retry budget SHALL be appended there once and SHALL NOT remain the next uncommitted message on that partition.

#### Scenario: Permanent handler failure
- **WHEN** a message makes the handler throw on every attempt until the budget is spent
- **THEN** one dead-letter record is produced
- **AND** the partition advances past that message
