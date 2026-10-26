# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Worker page fetch emits one message per article`
- TO: `### Requirement: Worker page fetch emits the page array`
- FROM: `### Requirement: Worker article fetch parses an integer`
- TO: `### Requirement: Worker article fetch reads the article URL`

## MODIFIED Requirements

### Requirement: Worker page fetch emits the page array
The worker page handler SHALL parse the value as a base-10 integer page number, fetch that Público list page, and produce one PUBLICO message with key PAGE_DATA whose value is the JSON array of articles on that page.

#### Scenario: Page returns three articles
- **WHEN** the list endpoint returns three article objects
- **THEN** the worker produces one PAGE_DATA message
- **AND** the value is a JSON array of those three objects

### Requirement: Worker article fetch reads the article URL
The worker article handler SHALL parse the message value as the article JSON object the manager enqueued and SHALL request the Público article URL on that object.

#### Scenario: Value is a JSON article
- **WHEN** the value is the JSON object the manager enqueues, including a url field
- **THEN** the HTTP request uses that url
- **AND** parseInt is not how the URL is chosen
