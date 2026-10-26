# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Manager and worker pods have no probes or resources`
- TO: `### Requirement: Manager and worker pods expose health and limits`
- FROM: `### Requirement: ZooKeeper mounts the broker claim`
- TO: `### Requirement: Kafka and ZooKeeper use distinct claims`

## MODIFIED Requirements

### Requirement: Manager and worker pods expose health and limits
The manager and worker Deployments SHALL set replicas to 1, the Kafka host and port, a readiness probe, a liveness probe, and CPU and memory requests and limits. They SHALL NOT add a Postgres environment variable in this change. A failing liveness probe SHALL be the signal that restarts the container. The Services MAY keep their current port numbers.

#### Scenario: Manager manifest
- **WHEN** the manager Deployment is rendered
- **THEN** it has one replica, a readiness probe, a liveness probe, and resource requests and limits
- **AND** KAFKA_HOST remains kafka-cluster-ip-service

#### Scenario: Container exits
- **WHEN** the manager liveness probe fails
- **THEN** the kubelet restarts the container
- **AND** a ready pod is one whose readiness probe is passing

### Requirement: Kafka and ZooKeeper are single plaintext pods
The Kafka Deployment SHALL use one replica and plaintext on port 9092, and the ZooKeeper Deployment SHALL use one replica on port 2181. Both SHALL set a readiness probe, a liveness probe, and CPU and memory requests and limits. Neither SHALL set hostPort. Neither SHALL create the PUBLICO or OBSERVADOR topics.

#### Scenario: Broker pod
- **WHEN** the Kafka pod spec is rendered
- **THEN** listeners stay plaintext
- **AND** hostPort is absent
- **AND** a readiness probe and resource limits are set

### Requirement: Kafka and ZooKeeper use distinct claims
The broker PVC and the registry PVC SHALL each request 2Gi ReadWriteOnce. The Kafka pod SHALL mount broker-persistent-volume-claim. The ZooKeeper pod SHALL mount registry-persistent-volume-claim and SHALL NOT mount the broker claim.

#### Scenario: Both pods scheduled
- **WHEN** Kafka and ZooKeeper are both scheduled
- **THEN** their volume claim names differ
- **AND** the registry claim is the one ZooKeeper uses
