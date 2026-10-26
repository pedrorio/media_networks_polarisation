"""Golden tests for the pure TypeScript transform and id-batch functions."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
FIXTURES = REPO / "tests" / "fixtures" / "transforms"
GOLDEN = REPO / "tests" / "golden" / "transforms"
TS_NODE = REPO / "loader" / "node_modules" / ".bin" / "ts-node"

CASES = (
    ("publico-transform", "publico.json"),
    ("observador-transform", "observador.json"),
    ("observador-bulk", "observador-bulk.json"),
    ("observador-batches", "batches.json"),
    ("range", "range.json"),
)


@pytest.mark.parametrize(("command", "fixture_name"), CASES)
def test_transform_matches_golden(command: str, fixture_name: str) -> None:
    env = os.environ.copy()
    env["NODE_PATH"] = str(REPO / "loader" / "node_modules")
    completed = subprocess.run(
        [
            str(TS_NODE),
            "--project",
            str(REPO / "loader" / "tsconfig.json"),
            "--transpile-only",
            str(REPO / "tests" / "support" / "dump_transforms.ts"),
            command,
            str(FIXTURES / fixture_name),
        ],
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(f"{command} exited {completed.returncode}\n{completed.stderr}")
    expected = (GOLDEN / f"{command}.json").read_text()
    assert completed.stdout == expected
