# Design

## Context

See proposal.md. Deployments omit probes and resources. Both data pods reference `broker-persistent-volume-claim`. hostPort is set on 9092 and 2181.

## Goals / Non-Goals

**Goals:**

- A pod that is not consuming or not answering its port is not Ready, and it is restarted when liveness fails.
- Each container has requests and limits.
- Kafka and ZooKeeper can schedule on the same node.

**Non-Goals:**

- Horizontal pod autoscaling.
- TLS on the broker.
- Fixing Skaffold paths or adding Postgres. Those are a separate change.
- Implementing this in the current pull request.

## Decisions

- Readiness for manager and worker is a file or HTTP check the process touches after the consumer joins the group. They do not listen today, so a TCP probe on 3000 or 5000 would never pass. Alternative considered: tcpSocket on the Service port. Rejected because those ports are not open.
- Kafka and ZooKeeper use tcpSocket on 9092 and 2181, without hostPort.
- Requests are small (100m CPU, 256Mi memory) and limits are 500m and 512Mi for the app pods, 500m and 1Gi for the broker. The requirement is that both requests and limits exist; the numbers are the design default.

## Risks / Trade-offs

- [Liveness that restarts a slow crawl] → liveness checks the process heartbeat, not crawl progress. Crawl stalls are the dead-letter and backpressure changes.
- [ReadWriteOnce still pins each volume to one node] → that is acceptable for a single replica. The defect being removed is two pods sharing one claim.

## Migration Plan

- Apply the claim change before recreating the ZooKeeper pod so it does not fight Kafka for the broker volume. Rollback restores the old manifests; ZooKeeper data on the registry volume is then unused.

## Open Questions

- None.
