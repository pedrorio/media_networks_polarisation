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

### Requirement: Worker page fetch emits the page array
The worker page handler SHALL parse the value as a base-10 integer page number, fetch that Público list page, and produce one PUBLICO message with key PAGE_DATA whose value is the JSON array of articles on that page.

#### Scenario: Page returns three articles
- **WHEN** the list endpoint returns three article objects
- **THEN** the worker produces one PAGE_DATA message
- **AND** the value is a JSON array of those three objects

### Requirement: Manager page handler treats the value as an array
The manager PAGE_DATA handler SHALL parse the value as JSON and map it as an array of articles. For each element whose title is not already stored it SHALL produce RETRIEVE_ARTICLE with that element's JSON as the value.

#### Scenario: Value is a JSON array
- **WHEN** the value is a JSON array of article objects
- **THEN** the manager looks up titles and enqueues one RETRIEVE_ARTICLE per title that is not stored

#### Scenario: Value is one article object
- **WHEN** the value is a single JSON object
- **THEN** mapping the parsed value as an array throws
- **AND** no RETRIEVE_ARTICLE message is produced

### Requirement: Worker article fetch reads the article URL
The worker article handler SHALL parse the message value as the article JSON object the manager enqueued and SHALL request the Público article URL on that object.

#### Scenario: Value is a JSON article
- **WHEN** the value is the JSON object the manager enqueues, including a url field
- **THEN** the HTTP request uses that url
- **AND** parseInt is not how the URL is chosen

### Requirement: Observador crawl fans out the current id batches
The worker SHALL ignore the seed value, fetch the Observador widget, and reply with the most recent article JSON under key MOST_RECENT_ARTICLE_DATA. The manager SHALL split that id with getArticleIdBatches using multiple 1000 and SHALL send FILTER_ARTICLES messages under the outstanding-work cap. The worker SHALL POST each received batch to the Observador fetchbulk endpoint and SHALL emit one FILTERED_ARTICLE_DATA message per returned article.

#### Scenario: Widget reply
- **WHEN** the manager receives MOST_RECENT_ARTICLE_DATA
- **THEN** it produces FILTER_ARTICLES messages only up to the outstanding-work cap
- **AND** it waits for completions before sending the rest

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

### Requirement: Article writes are idempotent on source identity
Each produced article message SHALL carry the outlet and the source article id. A second delivery of the same pair SHALL NOT insert another article row. Title SHALL NOT be the idempotency key.

#### Scenario: Same record delivered twice
- **WHEN** the same outlet and source article id are handled twice
- **THEN** the article table contains one row for that pair
- **AND** follow-up produces from the first attempt are not recalled

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

### Requirement: No application processing deadline
Manager and worker code SHALL NOT set a per-message timeout. KafkaJS session and request timeouts SHALL remain the library defaults because the application does not pass them. The Deployment manifests SHALL NOT set a probe timeout.

#### Scenario: Slow handler
- **WHEN** a handler waits longer than any application-configured deadline
- **THEN** no application deadline exists to fire
- **AND** only the library and the broker can interrupt the member

### Requirement: Outstanding crawl work is bounded
The manager SHALL keep outstanding RETRIEVE_ARTICLE and FILTER_ARTICLES messages at or below a configured cap. It SHALL send more only as earlier messages of that kind are completed. It SHALL NOT put an entire crawl into one producer call.

#### Scenario: Large Observador id
- **WHEN** batch splitting returns more batches than the cap
- **THEN** the first send contains at most the cap
- **AND** further batches are sent only as earlier batches complete

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

### Requirement: Saved rows keep transformed fields
The object passed to the article repository SHALL include the transformed title, text, date, tags, authors, and newspaper name. `excludeExtraneousValues` SHALL NOT drop those fields.

#### Scenario: Público transform round-trip
- **WHEN** a transformed Público article is converted for save
- **THEN** title, text, date, tag names, author names, and newspaper name are still set
