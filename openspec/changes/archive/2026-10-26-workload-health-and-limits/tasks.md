# Tasks

## 1. App pods

- [x] 1.1 Add readiness and liveness probes and CPU and memory requests and limits to the manager and worker Deployments, and verify `kustomize build` renders all four fields
- [x] 1.2 Make readiness pass only after the consumer has joined, and verify a unit test that the probe is failing before join and passing after

## 2. Broker pods

- [x] 2.1 Add probes and resource requests and limits to Kafka and ZooKeeper and remove hostPort, and verify the rendered spec has no hostPort
- [x] 2.2 Point the ZooKeeper volume at registry-persistent-volume-claim, and verify the two claim names in the rendered pods differ
