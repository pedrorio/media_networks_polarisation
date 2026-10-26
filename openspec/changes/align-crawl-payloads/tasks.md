# Tasks

## 1. Payloads

- [ ] 1.1 Send one PAGE_DATA message with a JSON array and verify a handler test with three articles produces one message whose value parses as an array of three
- [ ] 1.2 Read `url` from the RETRIEVE_ARTICLE JSON and request that path, and verify a fixture URL is the one passed to the HTTP client
- [ ] 1.3 Feed the page array into the existing manager handler and verify it enqueues one RETRIEVE_ARTICLE per new title without throwing
