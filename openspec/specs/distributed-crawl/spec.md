# Distributed crawl

## Purpose

How the manager creates crawl work on Kafka, how workers claim it, and what the Público and Observador handlers do with a message, including crashes and the writes that follow.

## Requirements

### Requirement: Manager seeds both crawls on startup
The manager process SHALL produce one Público message and one Observador message before it subscribes. It SHALL NOT consult stored crawl progress before those sends.

#### Scenario: Process start
- **WHEN** the manager process starts and the producer connects
- **THEN** it sends topic PUBLICO, key RETRIEVE_PAGE_OLDEST_ARTICLE, value "1"
- **AND** it sends topic OBSERVADOR, key RETRIEVE_MOST_RECENT_ARTICLE, value null

### Requirement: Two consumer groups read both topics
The manager SHALL use consumer group manager-group and the worker SHALL use worker-group. Each process SHALL subscribe to topics PUBLICO and OBSERVADOR with fromBeginning set. The application SHALL NOT create topics or set a partition count. Claiming a message SHALL be the KafkaJS 1.12 round-robin assignment for that group, not a lease in application code.

#### Scenario: Both groups receive a message
- **WHEN** a record is appended to PUBLICO or OBSERVADOR
- **THEN** each group can receive that record
- **AND** only the group whose handler recognises the key acts on it

#### Scenario: New group with no committed offset
- **WHEN** a group has no committed offset for a partition
- **THEN** that group reads the partition from the beginning

### Requirement: Unknown keys are committed as no-ops
A handler SHALL return without side effects when the key is not one of its cases. The offset SHALL then be eligible for commit. The handler SHALL NOT write a dead-letter record.

#### Scenario: Worker receives a manager result key
- **WHEN** the worker reads a message whose key is PAGE_DATA, ARTICLE_DATA, RETRIEVED_PAGE_OLDEST_ARTICLE_DATA, MOST_RECENT_ARTICLE_DATA, or FILTERED_ARTICLE_DATA
- **THEN** it produces nothing and writes nothing
- **AND** the handler returns normally

#### Scenario: Manager receives a work key
- **WHEN** the manager reads a message whose key is RETRIEVE_PAGE, RETRIEVE_ARTICLE, RETRIEVE_PAGE_OLDEST_ARTICLE, RETRIEVE_MOST_RECENT_ARTICLE, or FILTER_ARTICLES
- **THEN** it produces nothing and writes nothing

### Requirement: Público crawl advances only while an oldest article is present
The worker SHALL parse the message value as a base-10 integer page number, fetch that Público page's oldest article, and reply on PUBLICO with key RETRIEVED_PAGE_OLDEST_ARTICLE_DATA and a JSON object of pageOldestArticle and pageNumber. The manager SHALL enqueue RETRIEVE_PAGE and RETRIEVE_PAGE_OLDEST_ARTICLE for pageNumber + 1 only when pageOldestArticle is truthy. The unused lastPage constant SHALL NOT bound the crawl.

#### Scenario: Page still has an article
- **WHEN** the oldest-article reply contains a pageOldestArticle value
- **THEN** the manager produces both next-page keys with the value of pageNumber + 1

#### Scenario: Empty page omits the article
- **WHEN** the page has no articles and the reply is JSON.stringified
- **THEN** pageOldestArticle is omitted
- **AND** the manager produces no next-page messages

### Requirement: Worker page fetch emits one message per article
The worker page handler SHALL parse the value as a base-10 integer, fetch that Público list page, and produce one PUBLICO message per returned element with key PAGE_DATA and that element as JSON. It SHALL NOT send the page as one array.

#### Scenario: Page returns three articles
- **WHEN** the list endpoint returns three article objects
- **THEN** the worker produces three PAGE_DATA messages
- **AND** each value is one article object

### Requirement: Manager page handler treats the value as an array
The manager PAGE_DATA handler SHALL parse the value as JSON and map it as an array of articles. For each element whose title is not already stored it SHALL produce RETRIEVE_ARTICLE with that element's JSON as the value.

#### Scenario: Value is a JSON array
- **WHEN** the value is a JSON array of article objects
- **THEN** the manager looks up titles and enqueues one RETRIEVE_ARTICLE per title that is not stored

#### Scenario: Value is one article object
- **WHEN** the value is a single JSON object, which is what the worker page handler sends
- **THEN** mapping the parsed value as an array throws
- **AND** no RETRIEVE_ARTICLE message is produced

### Requirement: Worker article fetch parses an integer
The worker article handler SHALL parse the message value with parseInt and SHALL request the Público article URL derived from that integer.

#### Scenario: Value is a JSON article
- **WHEN** the value is the JSON object the manager enqueues
- **THEN** parseInt yields NaN
- **AND** the HTTP request is not built from an article URL

### Requirement: Observador crawl fans out the current id batches
The worker SHALL ignore the seed value, fetch the Observador widget, and reply with the most recent article JSON under key MOST_RECENT_ARTICLE_DATA. The manager SHALL split that id with getArticleIdBatches using multiple 1000 and SHALL send every batch in one producer call under key FILTER_ARTICLES. The worker SHALL POST each batch to the Observador fetchbulk endpoint and SHALL emit one FILTERED_ARTICLE_DATA message per returned article.

#### Scenario: Widget reply
- **WHEN** the manager receives MOST_RECENT_ARTICLE_DATA
- **THEN** it produces one FILTER_ARTICLES message per batch
- **AND** it does not wait for a batch to finish before sending the rest

### Requirement: Id batches cover every id up to the newest
The manager SHALL enqueue FILTER_ARTICLES batches that together contain every integer from 1 through the most recent Observador id, inclusive, with at most 1000 ids in each batch and no gaps or duplicates.

#### Scenario: Id 10 split by 4
- **WHEN** the most recent id is 10 and the batch size is 4
- **THEN** the batches are [1, 2, 3, 4], [5, 6, 7, 8], and [9, 10]

#### Scenario: Id 2500 split by 1000
- **WHEN** the most recent id is 2500 and the batch size is 1000
- **THEN** the batches cover every id from 1 through 2500 once
- **AND** no batch holds more than 1000 ids

### Requirement: Offsets commit after handlers return
The application SHALL NOT set autoCommit, autoCommitInterval, or autoCommitThreshold. With kafkajs 1.12 those defaults leave commitOffsetsIfNecessary a no-op, and the fetch loop SHALL commit resolved offsets after the batch. An offset SHALL NOT be resolved before the handler returns. Producer sends SHALL NOT set acks, a transactional id, or the idempotent producer, so the library default acks of -1 and idempotent false apply.

#### Scenario: Handler still running
- **WHEN** a handler has not returned
- **THEN** that message offset is not resolved and not committed

#### Scenario: Fetch completes
- **WHEN** every handler in the fetch has returned
- **THEN** the consumer commits the resolved offsets

### Requirement: Handler failures are retried then the consumer restarts
If a handler throws, the consumer SHALL commit only offsets already resolved in that fetch and SHALL leave the failed offset uncommitted. The consumer SHALL retry that fetch using the kafkajs 1.12 default of 10 retries. When those retries are exhausted the crash path SHALL restart the consumer because the error is KafkaJSNumberOfRetriesExceeded, which reads the same uncommitted message again. The application SHALL NOT cap those restarts.

#### Scenario: Handler throws
- **WHEN** eachMessage throws a non-KafkaJS error
- **THEN** the failed offset stays uncommitted
- **AND** earlier resolved offsets in that fetch are committed
- **AND** the fetch is retried

#### Scenario: Retries exhausted
- **WHEN** the tenth retry still fails
- **THEN** the consumer disconnects and starts again
- **AND** the same message is delivered again

### Requirement: No dead-letter topic
The application SHALL NOT declare a dead-letter topic, a retry topic, or a poison-message counter. A message that keeps failing SHALL remain the next message for that partition.

#### Scenario: Permanent handler failure
- **WHEN** a message makes the handler throw on every delivery
- **THEN** no dead-letter record is produced
- **AND** the consumer continues to restart onto that message

### Requirement: No idempotency key
Produced messages SHALL NOT carry an idempotency key or a deduplication header. A redelivery SHALL run the handler again. Database deduplication that does exist SHALL be a title lookup, not a source article id.

#### Scenario: Same record delivered twice
- **WHEN** a committed failure or a killed process causes Kafka to deliver a record again
- **THEN** the handler runs again with the same key and value
- **AND** follow-up produces from the first attempt are not recalled

### Requirement: Kill mid-handler does not roll back side effects
If the process is killed inside a handler, uncommitted offsets SHALL be delivered again after the group session ends. HTTP calls, follow-up produces, and database writes already performed SHALL NOT be rolled back. The application SHALL NOT open a transaction that covers Kafka and Postgres.

#### Scenario: Worker dies after producing a reply
- **WHEN** the worker has sent a result message and is then killed before the fetch commits
- **THEN** the original work message is delivered again
- **AND** the result message already appended stays on the topic

#### Scenario: Manager dies after a database save
- **WHEN** the manager has saved a row and is killed before the offset commit
- **THEN** the result message is delivered again
- **AND** the saved row is not removed

### Requirement: Manager restart appends new seeds
Every manager process start SHALL produce the two seed messages again, including when manager-group already has committed offsets. The new seeds SHALL be additional records. They SHALL NOT replace the log.

#### Scenario: Manager pod restarts
- **WHEN** the manager container starts again after a crash
- **THEN** another page-1 Público seed and another Observador seed are appended
- **AND** the group resumes from its committed offsets rather than trimming the log

### Requirement: No application processing deadline
Manager and worker code SHALL NOT set a per-message timeout. KafkaJS session and request timeouts SHALL remain the library defaults because the application does not pass them. The Deployment manifests SHALL NOT set a probe timeout.

#### Scenario: Slow handler
- **WHEN** a handler waits longer than any application-configured deadline
- **THEN** no application deadline exists to fire
- **AND** only the library and the broker can interrupt the member

### Requirement: No bound on outstanding crawl work
The manager SHALL send the full list of Público RETRIEVE_ARTICLE messages in one producer call and the full list of Observador FILTER_ARTICLES messages in one producer call. It SHALL NOT limit in-flight messages, pause the consumer, or sample the broker backlog.

#### Scenario: Large Observador id
- **WHEN** batch splitting returns many batches
- **THEN** one send contains every batch
- **AND** the manager does not wait for workers to drain them

### Requirement: Observador saves only when the title query is falsy
The filtered-article handler SHALL load articles by title and SHALL save only when that result is falsy. It SHALL run the same check the sequential Observador script runs. A TypeORM find result is an array, and an array SHALL count as truthy, including when it is empty, so the save SHALL NOT run.

#### Scenario: No stored article
- **WHEN** find by title returns an empty array
- **THEN** the handler does not save the article

#### Scenario: Title already stored
- **WHEN** find by title returns a non-empty array
- **THEN** the handler does not save the article

### Requirement: Público title filter runs only before the article fetch
On a PAGE_DATA value that is an array, the manager SHALL enqueue RETRIEVE_ARTICLE only for titles that are not already stored. The later ARTICLE_DATA save SHALL NOT repeat that check. The Article entity SHALL declare a unique index on title, and the save path SHALL NOT catch a unique violation.

#### Scenario: Duplicate title on the page
- **WHEN** a page array contains a title that is already stored
- **THEN** no RETRIEVE_ARTICLE message is produced for that title

#### Scenario: Redelivered article save
- **WHEN** ARTICLE_DATA is handled twice for a new title
- **THEN** both attempts call save
- **AND** a unique-title failure is not handled in application code

### Requirement: Newspaper link is hardcoded to Observador
The save path SHALL look up a newspaper named OBSERVADOR only. If that row is missing it SHALL save the article object through the newspaper repository. If the row exists it SHALL attach that Observador row to the article, including when the transformed newspaper name is PUBLICO.

#### Scenario: Observador row missing
- **WHEN** an article is saved and no OBSERVADOR newspaper row exists
- **THEN** the article object is passed to the newspaper repository save

#### Scenario: Observador row exists
- **WHEN** an article of either outlet is saved and an OBSERVADOR row exists
- **THEN** the article's newspaper is replaced with that row
