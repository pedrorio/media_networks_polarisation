"""Crawl cursor and duplicate-result suppression."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
TS_NODE = REPO / "loader" / "node_modules" / ".bin" / "ts-node"
RUNNER = REPO / "tests" / "support" / "run_crawl_cursor.ts"


def _run(command: str) -> dict:
    env = os.environ.copy()
    env["NODE_PATH"] = str(REPO / "loader" / "node_modules")
    completed = subprocess.run(
        [
            str(TS_NODE),
            "--project",
            str(REPO / "loader" / "tsconfig.json"),
            "--transpile-only",
            str(RUNNER),
            command,
        ],
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(f"{command} exited {completed.returncode}\n{completed.stderr}")
    return json.loads(completed.stdout)


def test_restart_reads_the_stored_page(tmp_path: Path) -> None:
    del tmp_path
    result = _run("resume")
    assert result["nextPage"] == 4
    assert result["pendingBatches"] == [[1, 2], [3, 4]]
    values = [item["value"] for item in result["messages"]]
    assert "4" in values
    assert "1" not in values
    assert all(item["key"] != "RETRIEVE_MOST_RECENT_ARTICLE" for item in result["messages"])


def test_second_start_appends_no_page_one_seed(tmp_path: Path) -> None:
    del tmp_path
    result = _run("seed-twice")
    assert result["pageOneSeeds"] == 0
    assert result["values"].count("4") == 4


def test_replayed_page_fetch_leaves_one_result(tmp_path: Path) -> None:
    del tmp_path
    result = _run("replay-page")
    assert result["count"] == 1
    assert result["workIdentity"] == "PUBLICO:page:3"


def test_replayed_save_keeps_one_row_and_the_cursor(tmp_path: Path) -> None:
    del tmp_path
    result = _run("replay-save")
    assert result["rows"] == 1
    assert result["nextPage"] == 4
