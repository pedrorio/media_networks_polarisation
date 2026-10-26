# Tasks

## 1. Build

- [ ] 1.1 Point the development Skaffold profile at `loader/microservices` Dockerfiles and kustomize paths, and verify `skaffold diagnose` or `skaffold build` resolves those paths
- [ ] 1.2 Switch the Dockerfiles to the tracked lockfile and a real start script, and verify `docker build` of the manager finishes and the script name is in package.json
- [ ] 1.3 Make `deploy.sh` use a profile the Skaffold file defines, and verify the profile name occurs in both files

## 2. Cluster contents

- [ ] 2.1 Remove or add the entity manifests so `kustomize build loader/microservices/k8s/base` exits 0, and verify that command
- [ ] 2.2 Add a Postgres Service and point ormconfig and the app pods at port 5432 and the nested entity glob, and verify the rendered worker env contains that host and port
- [ ] 2.3 Make `up.sh` apply the base and verify a dry-run apply lists the manager, worker, Kafka, ZooKeeper, and Postgres workloads
