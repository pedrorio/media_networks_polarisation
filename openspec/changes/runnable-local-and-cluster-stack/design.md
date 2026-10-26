# Design

## Context

See proposal.md. The manifests, Skaffold file, and Dockerfiles disagree with the directories and with `package.json`.

## Goals / Non-Goals

**Goals:**

- `kustomize build` exits 0.
- `skaffold dev -p development` resolves every path it names.
- Manager and worker containers start their TypeScript entrypoints and can open Postgres on 5432.

**Non-Goals:**

- Probes, resource limits, and the ZooKeeper volume claim. Those are the health change.
- Making the 2020 GKE version pin current. The entrypoint must apply manifests; the version pin can stay until someone asks to move it.
- Implementing this in the current pull request.

## Decisions

- Change the Dockerfiles to `npm ci` and `npm start`, and add `start` scripts that run the manager and worker with `ts-node`. One package.json is shared today, so the start script should be selected with an environment variable (`SERVICE=manager|worker`) rather than two packages. Alternative considered: a yarn.lock generated in the image. Rejected because the repo already has a package-lock.
- Delete the kustomize entries for the missing entities workload instead of inventing an entities service. Nothing in the manager imports a separate entities process.
- Add a Postgres Deployment and Service. Point ormconfig host, port, user, password, and database at environment variables, with the current literals only as local defaults outside the cluster. The entities glob becomes `entities/**/*.ts`.

## Risks / Trade-offs

- [synchronize: true against a shared database] → leave synchronize as it is in this change. A migration change can turn it off. This change only makes the connection target real.
- [Skaffold v2beta5 is old] → keep the apiVersion so the repair is the paths, not a Skaffold upgrade.

## Migration Plan

- The path and Dockerfile edits are local. The Postgres Service is additive. Rollback reverts the manifests; no data volume is required for the first boot beyond the existing PVCs.

## Open Questions

- None that change the requirements. The GKE version pin stays.
