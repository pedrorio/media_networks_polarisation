"""Deployment probes, resource limits, and the consumer readiness file."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

REPO = Path(__file__).resolve().parents[1]
BASE = REPO / "loader" / "microservices" / "k8s" / "base"
TS_NODE = REPO / "loader" / "node_modules" / ".bin" / "ts-node"
RUNNER = REPO / "tests" / "support" / "run_consumer_health.ts"
DEPLOYMENTS = (
    "manager/manager-deployment.yaml",
    "worker/worker-deployment.yaml",
    "kafka/kafka-deployment.yaml",
    "zookeeper/zookeeper-deployment.yaml",
)


def _kustomize_bin() -> str:
    found = shutil.which("kustomize")
    if found:
        return found
    local = Path.home() / ".local" / "bin" / "kustomize"
    if local.exists():
        return str(local)
    pytest.fail("kustomize is not installed")


def _render(tmp_path: Path) -> str:
    root = tmp_path / "k8s"
    root.mkdir()
    for relative in DEPLOYMENTS:
        source = BASE / relative
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(source, target)
    (root / "kustomization.yaml").write_text(
        "apiVersion: kustomize.config.k8s.io/v1beta1\n"
        "kind: Kustomization\n"
        "resources:\n"
        + "".join(f"  - {relative}\n" for relative in DEPLOYMENTS)
    )
    completed = subprocess.run(
        [_kustomize_bin(), "build", str(root)],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(completed.stderr)
    return completed.stdout


def _documents(rendered: str) -> list[dict]:
    return [doc for doc in yaml.safe_load_all(rendered) if doc]


def test_app_pods_render_probes_and_resources(tmp_path: Path) -> None:
    docs = {doc["metadata"]["name"]: doc for doc in _documents(_render(tmp_path))}
    for name in ("manager-deployment", "worker-deployment"):
        container = docs[name]["spec"]["template"]["spec"]["containers"][0]
        assert "readinessProbe" in container
        assert "livenessProbe" in container
        assert container["resources"]["requests"]["cpu"]
        assert container["resources"]["requests"]["memory"]
        assert container["resources"]["limits"]["cpu"]
        assert container["resources"]["limits"]["memory"]
        env = {item["name"]: item["value"] for item in container["env"]}
        assert env["KAFKA_HOST"] == "kafka-cluster-ip-service"
        assert not any(key.startswith("POSTGRES") for key in env)
        assert docs[name]["spec"]["replicas"] == 1


def test_broker_pods_render_without_hostport_and_use_distinct_claims(tmp_path: Path) -> None:
    rendered = _render(tmp_path)
    assert "hostPort" not in rendered
    docs = {doc["metadata"]["name"]: doc for doc in _documents(rendered)}
    kafka_claim = docs["kafka-deployment"]["spec"]["template"]["spec"]["volumes"][0][
        "persistentVolumeClaim"
    ]["claimName"]
    zookeeper_claim = docs["zookeeper-deployment"]["spec"]["template"]["spec"]["volumes"][0][
        "persistentVolumeClaim"
    ]["claimName"]
    assert kafka_claim == "broker-persistent-volume-claim"
    assert zookeeper_claim == "registry-persistent-volume-claim"
    assert kafka_claim != zookeeper_claim
    for name in ("kafka-deployment", "zookeeper-deployment"):
        container = docs[name]["spec"]["template"]["spec"]["containers"][0]
        assert "readinessProbe" in container
        assert "livenessProbe" in container
        assert container["resources"]["requests"]
        assert container["resources"]["limits"]


def test_readiness_flips_when_the_consumer_joins(tmp_path: Path) -> None:
    env = os.environ.copy()
    env["NODE_PATH"] = str(REPO / "loader" / "node_modules")
    env["CONSUMER_READY_FILE"] = str(tmp_path / "ready")
    env["CONSUMER_LIVE_FILE"] = str(tmp_path / "live")
    completed = subprocess.run(
        [
            str(TS_NODE),
            "--project",
            str(REPO / "loader" / "tsconfig.json"),
            "--transpile-only",
            str(RUNNER),
        ],
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(completed.stderr)
    result = json.loads(completed.stdout)
    assert result == {"readyBefore": False, "readyAfter": True, "liveBefore": False, "liveAfter": True}
