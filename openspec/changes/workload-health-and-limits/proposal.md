# Proposal

## Why

The manager, worker, Kafka, and ZooKeeper pods declare no readiness or liveness probes and no CPU or memory limits. Kafka and ZooKeeper pin hostPort 9092 and 2181, so a second pod cannot land on the same node. ZooKeeper's volume uses the broker's ReadWriteOnce claim, and the registry claim is unused. A dead process is restarted by the default restart policy, which re-runs the manager seed, and nothing checks that the process is actually consuming.

## What Changes

- Add readiness and liveness probes to the four workloads.
- Set CPU and memory requests and limits on each container.
- Remove hostPort from Kafka and ZooKeeper.
- Mount ZooKeeper on the registry claim, leaving the broker claim to Kafka.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cluster-workload`: Probes, resource bounds, host ports, and which claim ZooKeeper mounts.

## Impact

- The four Deployment manifests and the two volume claim names.
- Skaffold path repairs and the missing database stay in a separate change.
