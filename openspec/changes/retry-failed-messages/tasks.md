# Tasks

## 1. Dead-letter path

- [ ] 1.1 Add a consumer error path that retries a failing handler at most 5 times and verify with a unit test that the 6th failure does not call the handler again
- [ ] 1.2 Produce the original topic, key, value, and error text to the dead-letter topic and verify the test reads back one record
- [ ] 1.3 Commit the source offset only after that produce succeeds and verify a failed produce leaves the offset uncommitted

## 2. Restart loop

- [ ] 2.1 Stop the consumer crash path from restarting onto a message already dead-lettered and verify a poison fixture advances the partition
- [ ] 2.2 Document the dead-letter topic in the README failure section and verify the README names the retry budget of 5
