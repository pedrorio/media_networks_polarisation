# Proposal

## Why

The checked-in run path does not start. `kustomize` lists entity manifests that are not in the repo. Skaffold's contexts and kustomize paths do not match `loader/microservices`. `deploy.sh` selects a profile that is not defined. `up.sh` creates a GKE cluster and applies nothing. Dockerfiles copy `yarn.lock` and run `yarn start`, neither of which exists. ormconfig points Postgres at localhost port 3306, and no database workload is declared.

## What Changes

- Make `kustomize build` of the base succeed, and make the development Skaffold profile build the Dockerfiles that exist.
- Give the image a start script and a lockfile the Dockerfile can copy, or change the Dockerfile to the lockfile that is tracked.
- Point TypeORM at a Postgres Service in the same manifests, on the Postgres port, with entity paths that match the tree.
- Make the cluster entrypoint apply those manifests instead of only creating a GKE cluster.
- Define the profile `deploy.sh` calls, or change the script to the profile that exists.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cluster-workload`: The build, the image command, the database, and the cluster entrypoint.

## Impact

- `loader/skaffold.yaml`, both Dockerfiles, `package.json`, `ormconfig.ts`, the base kustomization, and `loader/microservices/k8s/infra/up.sh`.
- Probes and resource limits stay in the health change. This change does not add them.
