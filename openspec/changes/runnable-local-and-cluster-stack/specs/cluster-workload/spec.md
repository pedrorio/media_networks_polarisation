# Spec Delta

## MODIFIED Requirements

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
