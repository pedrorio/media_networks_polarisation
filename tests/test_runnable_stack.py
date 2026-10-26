"""Skaffold, image, kustomize, and database entrypoints."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

REPO = Path(__file__).resolve().parents[1]
LOADER = REPO / "loader"
BASE = LOADER / "microservices" / "k8s" / "base"


def _kustomize_bin() -> str:
    found = shutil.which("kustomize")
    if found:
        return found
    local = Path.home() / ".local" / "bin" / "kustomize"
    if local.exists():
        return str(local)
    pytest.fail("kustomize is not installed")


def _kustomize_build() -> str:
    completed = subprocess.run(
        [_kustomize_bin(), "build", str(BASE)],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(completed.stderr)
    return completed.stdout


def test_kustomize_base_exits_zero() -> None:
    rendered = _kustomize_build()
    for name in (
        "manager-deployment",
        "worker-deployment",
        "kafka-deployment",
        "zookeeper-deployment",
        "postgres-deployment",
    ):
        assert f"name: {name}" in rendered


def test_skaffold_development_paths_exist() -> None:
    config = yaml.safe_load((LOADER / "skaffold.yaml").read_text())
    profile = next(item for item in config["profiles"] if item["name"] == "development")
    for artifact in profile["build"]["artifacts"]:
        context = LOADER / artifact["context"]
        dockerfile = context / artifact["docker"]["dockerfile"]
        assert dockerfile.is_file(), dockerfile
        assert artifact["image"] != "news/entities"
    for rel in profile["deploy"]["kustomize"]["paths"]:
        assert (LOADER / rel).is_dir()
    overlay = (LOADER / "microservices/k8s/overlays/development/secrets/kustomization.yaml").read_text()
    assert "kafka.env" not in overlay


def test_deploy_script_uses_a_defined_profile() -> None:
    deploy = (LOADER / "deploy.sh").read_text()
    skaffold = (LOADER / "skaffold.yaml").read_text()
    selected = [line.split("-p ", 1)[1].split()[0] for line in deploy.splitlines() if "-p " in line]
    assert selected
    for name in selected:
        assert f"name: {name}" in skaffold


def test_images_use_the_tracked_lockfile_and_start_script() -> None:
    package = json.loads((LOADER / "package.json").read_text())
    assert "start" in package["scripts"]
    assert "ts-node" in package["scripts"]["start"]
    assert "SERVICE" in package["scripts"]["start"]
    for relative in ("microservices/manager/Dockerfile", "microservices/worker/Dockerfile"):
        text = (LOADER / relative).read_text()
        assert "package-lock.json" in text
        assert "yarn.lock" not in text
        assert 'CMD ["npm", "start"]' in text


def test_worker_env_points_at_postgres() -> None:
    docs = {
        doc["metadata"]["name"]: doc
        for doc in yaml.safe_load_all(_kustomize_build())
        if isinstance(doc, dict) and doc.get("kind") == "Deployment"
    }
    env = {
        item["name"]: item["value"]
        for item in docs["worker-deployment"]["spec"]["template"]["spec"]["containers"][0]["env"]
    }
    assert env["DB_HOST"] == "postgres-cluster-ip-service"
    assert env["DB_PORT"] == "5432"
    orm = (LOADER / "ormconfig.ts").read_text()
    assert "5432" in orm
    assert "entities/**/*.ts" in orm
    assert "3306" not in orm


def test_up_script_applies_the_base() -> None:
    script = (LOADER / "microservices/k8s/infra/up.sh").read_text()
    assert "kubectl apply -k" in script
    assert "base" in script
    rendered = _kustomize_build()
    for name in (
        "manager-deployment",
        "worker-deployment",
        "kafka-deployment",
        "zookeeper-deployment",
        "postgres-deployment",
    ):
        assert f"name: {name}" in rendered


def test_manager_image_builds() -> None:
    if shutil.which("docker") is None:
        pytest.skip("docker is not installed")
    info = subprocess.run(
        ["docker", "info"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if info.returncode != 0:
        pytest.skip("docker daemon is not running")
    completed = subprocess.run(
        [
            "docker",
            "build",
            "-f",
            "microservices/manager/Dockerfile",
            "-t",
            "news/manager:test",
            ".",
        ],
        cwd=LOADER,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(completed.stderr)
