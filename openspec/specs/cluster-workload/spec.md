# Cluster workload

## Purpose

What the Kubernetes manifests, Skaffold file, Dockerfiles, and database config declare. Several of those declarations do not form a workload that can start.

## Requirements

### Requirement: Manager and worker pods expose health and limits
The manager and worker Deployments SHALL set replicas to 1, the Kafka host and port, a readiness probe, a liveness probe, and CPU and memory requests and limits. A failing liveness probe SHALL be the signal that restarts the container. The Services MAY keep their current port numbers.

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
The base kustomization SHALL list only manifests that exist in the repo, or the missing entity manifests SHALL be added. `kustomize build` of `loader/microservices/k8s/base` SHALL succeed. The development overlay SHALL NOT reference an env file that is not created by the repo.

#### Scenario: Build the base
- **WHEN** kustomize builds loader/microservices/k8s/base
- **THEN** the build exits 0
- **AND** the output includes the manager, worker, Kafka, and ZooKeeper workloads

### Requirement: Skaffold development paths do not match the tree
The development profile SHALL build the manager and worker Dockerfiles under `loader/microservices` and SHALL point kustomize at `loader/microservices/k8s`. It SHALL NOT list an entities image unless that Dockerfile exists.

#### Scenario: Skaffold dev from loader
- **WHEN** skaffold dev -p development renders its build
- **THEN** each build context contains the Dockerfile it names
- **AND** the kustomize path exists

### Requirement: Deploy script selects a missing profile
`loader/deploy.sh` SHALL invoke a Skaffold profile that the Skaffold file defines.

#### Scenario: Run deploy.sh
- **WHEN** deploy.sh selects its profile
- **THEN** that profile name is present in loader/skaffold.yaml

### Requirement: Cluster script only creates a GKE cluster
`up.sh` SHALL apply the kustomize base after the cluster exists, or the README's Kubernetes path SHALL be a single command that both creates a cluster and applies the base. Applying the base SHALL be part of the documented entrypoint, not a step the script skips.

#### Scenario: up.sh
- **WHEN** up.sh succeeds against a reachable cluster
- **THEN** the manager, worker, Kafka, and ZooKeeper workloads have been applied
- **AND** creating the cluster is not the only action

### Requirement: Database config does not match a cluster database
The manifests SHALL run Postgres. ormconfig SHALL use the Postgres port 5432 and a host the manager and worker can resolve inside the cluster. The entities glob SHALL match the nested entity files. The manager and worker pods SHALL receive the database host, name, user, and password from the cluster config rather than from the literals localhost, port 3306, and test/test only.

#### Scenario: Worker pod environment
- **WHEN** the worker pod spec is rendered
- **THEN** it includes a database host that is the Postgres Service
- **AND** the port is 5432

### Requirement: Images do not match the package scripts
Each image build SHALL copy a lockfile that the repo contains and SHALL run a package script that the repo defines. That script SHALL start the manager or the worker entrypoint. The build SHALL NOT require yarn.lock while package-lock.json is the tracked lockfile, and SHALL NOT call a start script that does not exist.

#### Scenario: Docker build of the manager
- **WHEN** the manager image is built from the repo
- **THEN** the lockfile copy succeeds
- **AND** the container command is a script listed in package.json
