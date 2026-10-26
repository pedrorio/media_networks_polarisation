#!/bin/bash
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
gcloud container clusters create enterprise-integration \
--cluster-version=1.16.9-gke.6 \
--machine-type=e2-small \
--num-nodes=3 \
--min-nodes=0 \
--zone=europe-west2-a
kubectl apply -k "$root/base"
