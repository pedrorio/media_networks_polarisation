# Cluster workload

## Purpose

What the Kubernetes manifests, Skaffold file, Dockerfiles, and database config declare. Several of those declarations do not form a workload that can start.

## Requirements

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

### Requirement: Kustomize base points at missing entity manifests
The base kustomization SHALL list entity service and deployment files under entities/. Those files SHALL NOT be in the repo, so kustomize build of the base SHALL fail before any pod is applied. The development secrets overlay SHALL reference kafka.env, which SHALL NOT be committed.

#### Scenario: Build the base
- **WHEN** kustomize builds loader/microservices/k8s/base
- **THEN** the build fails because the entity manifests are absent

### Requirement: Skaffold development paths do not match the tree
loader/skaffold.yaml SHALL define only the development profile. Its image contexts SHALL be manager, worker, and entities, and its kustomize paths SHALL be k8s/overlays/development/secrets and k8s/base, resolved from loader/. The Dockerfiles and manifests SHALL live under loader/microservices/ instead. There SHALL be no entities Dockerfile.

#### Scenario: Skaffold dev from loader
- **WHEN** skaffold dev -p development runs with the working directory loader
- **THEN** the build contexts manager, worker, and entities are not the directories that contain the Dockerfiles

### Requirement: Deploy script selects a missing profile
loader/deploy.sh SHALL run skaffold build and skaffold run with profile ci. The Skaffold file SHALL NOT define a ci profile.

#### Scenario: Run deploy.sh
- **WHEN** deploy.sh invokes skaffold with -p ci
- **THEN** skaffold does not find that profile

### Requirement: Cluster script only creates a GKE cluster
loader/microservices/k8s/infra/up.sh SHALL create a GKE cluster named enterprise-integration with cluster version 1.16.9-gke.6, machine type e2-small, three nodes, and zone europe-west2-a. It SHALL NOT apply manifests. down.sh SHALL delete that cluster name and SHALL NOT pass a non-interactive flag.

#### Scenario: up.sh
- **WHEN** up.sh succeeds
- **THEN** the named GKE cluster exists
- **AND** the script has not applied the kustomize base

### Requirement: Database config does not match a cluster database
ormconfig SHALL select Postgres on localhost port 3306, user test, password test, database test, with synchronize true. The entities glob SHALL be entities/*.ts, which SHALL NOT match the nested entity files. No manifest SHALL run Postgres. Credentials SHALL be those literals, not a Secret consumed by the manager or worker.

#### Scenario: Worker pod environment
- **WHEN** the worker pod spec is rendered
- **THEN** it has Kafka variables only
- **AND** it has no database host

### Requirement: Images do not match the package scripts
Each Dockerfile SHALL copy package.json and yarn.lock, install with yarn, and SHALL set the container command to yarn start. The repo SHALL contain package-lock.json and SHALL NOT contain yarn.lock. package.json SHALL NOT define a start script.

#### Scenario: Docker build of the manager
- **WHEN** the manager Dockerfile is built from a context that has package.json and no yarn.lock
- **THEN** the yarn.lock copy fails
- **AND** there is no start script for the command to run
