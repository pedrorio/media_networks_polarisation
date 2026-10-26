"""Handler retry budget and the crawl dead-letter topic."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
TS_NODE = REPO / "loader" / "node_modules" / ".bin" / "ts-node"
RUNNER = REPO / "tests" / "support" / "run_message_retry.ts"

DELIVERY = {
    "topic": "PUBLICO",
    "partition": 0,
    "offset": "4",
    "key": "RETRIEVE_PAGE",
    "value": "1",
}


def _run(command: str, tmp_path: Path, payload: dict | None = None) -> dict:
    args = [
        str(TS_NODE),
        "--project",
        str(REPO / "loader" / "tsconfig.json"),
        "--transpile-only",
        str(RUNNER),
        command,
    ]
    if payload is not None:
        input_path = tmp_path / f"{command}.json"
        input_path.write_text(json.dumps(payload))
        args.append(str(input_path))
    env = os.environ.copy()
    env["NODE_PATH"] = str(REPO / "loader" / "node_modules")
    completed = subprocess.run(
        args,
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(f"{command} exited {completed.returncode}\n{completed.stderr}")
    return json.loads(completed.stdout)


def test_handler_is_not_called_a_sixth_time(tmp_path: Path) -> None:
    result = _run("budget", tmp_path)
    assert result["attempts"] == 5
    assert result["deadLetters"] == 1


def test_dead_letter_record_contains_the_failed_message(tmp_path: Path) -> None:
    result = _run("dead-letter", tmp_path, DELIVERY)
    assert result["deadLetterTopic"] == "CRAWL_DEAD_LETTER"
    assert len(result["records"]) == 1
    record = result["records"][0]
    assert record["topic"] == "PUBLICO"
    assert record["key"] == "RETRIEVE_PAGE"
    assert record["value"] == "1"
    assert record["error"] == "boom"


def test_failed_dead_letter_produce_leaves_the_offset_uncommitted(tmp_path: Path) -> None:
    result = _run("produce-fails", tmp_path, DELIVERY)
    assert result["committed"] is False
    assert result["produceAttempts"] == 1
    assert result["error"] == "produce failed"


def test_poison_message_advances_the_partition(tmp_path: Path) -> None:
    result = _run("poison", tmp_path)
    assert result["committed"] == ["0", "1", "2"]
    assert result["poisonAttempts"] == 5
    assert result["restartedAttempts"] == 0
    assert result["deadLetters"] == 1


def test_readme_names_the_retry_budget_and_dead_letter_topic() -> None:
    readme = (REPO / "README.md").read_text()
    assert "CRAWL_DEAD_LETTER" in readme
    assert "tried 5 times" in readme
