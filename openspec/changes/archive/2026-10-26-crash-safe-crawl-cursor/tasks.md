# Tasks

## 1. Cursor

- [x] 1.1 Store the next Público page and unfinished Observador batch ids and verify a restart test reads the stored page rather than 1
- [x] 1.2 Skip the startup seed when that cursor is unfinished and verify a second process start appends no page-1 message

## 2. Redelivery

- [x] 2.1 Key result messages by work identity and skip a duplicate send, and verify a killed-then-replayed worker fixture leaves one result
- [x] 2.2 Pair the article save with the cursor update so a replay does not insert a second row, and verify the row count stays 1
