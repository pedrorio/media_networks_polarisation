"""Manager cap on outstanding crawl work."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
TS_NODE = REPO / "loader" / "node_modules" / ".bin" / "ts-node"
RUNNER = REPO / "tests" / "support" / "run_crawl_fanout.ts"


def _run(command: str, tmp_path: Path) -> dict:
    input_path = tmp_path / f"{command}.json"
    input_path.write_text(json.dumps({"cap": 2}))
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
            str(input_path),
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


def test_observador_fanout_stops_at_the_cap(tmp_path: Path) -> None:
    result = _run("observador", tmp_path)
    assert result["beforeCompletion"] == [2]
    assert result["keys"][:2] == ["FILTER_ARTICLES", "FILTER_ARTICLES"]


def test_observador_sends_the_rest_after_a_result(tmp_path: Path) -> None:
    result = _run("observador", tmp_path)
    assert result["sendSizes"] == [2, 1]
    assert result["keys"] == ["FILTER_ARTICLES", "FILTER_ARTICLES", "FILTER_ARTICLES"]


def test_publico_articles_stop_at_the_cap_until_one_returns(tmp_path: Path) -> None:
    result = _run("publico", tmp_path)
    assert result["beforeCompletion"] == [2]
    assert result["sendSizes"] == [2, 1]
    assert result["keys"] == ["RETRIEVE_ARTICLE", "RETRIEVE_ARTICLE", "RETRIEVE_ARTICLE"]


def test_readme_names_the_outstanding_cap() -> None:
    readme = (REPO / "README.md").read_text()
    assert "CRAWL_OUTSTANDING_CAP" in readme
