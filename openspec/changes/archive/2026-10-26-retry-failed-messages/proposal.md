# Proposal

## Why

A handler that throws leaves the offset uncommitted. kafkajs 1.12 then retries the fetch 10 times and restarts the consumer onto the same record, with no cap and no dead-letter topic. One poison message stalls the partition. Keys meant for the other consumer group are not poison: each group already ignores the other's keys, and that part stays.

## What Changes

- Cap handler retries for a single message.
- After the budget, append the record to a dead-letter topic and commit the original offset.
- Stop the crash path from restarting forever on that message.
- Leave cross-group key ignoring as it is.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `distributed-crawl`: Replace unbounded consumer restarts and the missing dead-letter topic with a bounded retry and a dead-letter write.

## Impact

- `loader/microservices/manager/index.ts` and `loader/microservices/worker/index.ts` consumer loops.
- A new Kafka topic for dead letters. No change to the Airflow DAG files.
