"""Idempotent article saves keyed by outlet and source id."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
TS_NODE = REPO / "loader" / "node_modules" / ".bin" / "ts-node"
RUNNER = REPO / "tests" / "support" / "run_article_writes.ts"

PUBLICO = {
    "id": 42,
    "titulo": "Mesmo titulo",
    "data": "2020-08-01",
    "texto": "corpo publico",
    "url": "/2020/08/01/primeira",
    "tags": [{"name": "Politica"}],
    "autores": [{"nome": "Ana Silva", "contribuicao": "Texto"}],
}

OBSERVADOR = {
    "id": 7,
    "title": "Mesmo titulo",
    "date": {"datetime": "2020-08-01T00:00:00.000Z"},
    "categories": [{"name": "Politica"}],
    "textCredits": [{"user": {"displayName": "Eva Lopes"}}],
    "content": "corpo",
}


def _run(command: str, payload: dict, tmp_path: Path) -> dict:
    input_path = tmp_path / f"{command}.json"
    input_path.write_text(json.dumps(payload))
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


def test_mapper_keeps_identity_and_transformed_fields(tmp_path: Path) -> None:
    result = _run("map", {"publico": PUBLICO, "observador": OBSERVADOR}, tmp_path)
    publico = result["publico"]
    observador = result["observador"]
    assert publico["sourceArticleId"] == 42
    assert publico["newspaper"]["name"] == "PUBLICO"
    assert publico["title"] == "Mesmo titulo"
    assert publico["text"] == "corpo publico"
    assert publico["date"]
    assert publico["tags"][0]["name"] == "Politica"
    assert publico["authors"][0]["name"] == "Ana Silva"
    observador_paper = observador["newspaper"]["name"]
    assert observador["sourceArticleId"] == 7
    assert observador_paper == "OBSERVADOR"
    assert observador["title"] == "Mesmo titulo"
    assert observador["text"] == "corpo"
    assert observador["tags"][0]["name"] == "Politica"
    assert observador["authors"][0]["name"] == "Eva Lopes"


def test_empty_observador_lookup_inserts_one_row(tmp_path: Path) -> None:
    result = _run("save-observador", {"article": OBSERVADOR}, tmp_path)
    assert len(result["rows"]) == 1
    assert result["rows"][0]["sourceArticleId"] == 7
    assert result["rows"][0]["title"] == "Mesmo titulo"
    assert result["rows"][0]["newspaper"]["name"] == "OBSERVADOR"


def test_second_delivery_does_not_insert_another_row(tmp_path: Path) -> None:
    result = _run("save-again", {"publico": PUBLICO, "observador": OBSERVADOR}, tmp_path)
    assert result["publicoCount"] == 1
    assert result["observadorCount"] == 1


def test_unique_violation_on_redelivery_is_not_a_crash(tmp_path: Path) -> None:
    result = _run("save-race", {"publico": PUBLICO}, tmp_path)
    assert result["rows"] == 1


def test_same_title_and_different_source_id_inserts_both(tmp_path: Path) -> None:
    other = dict(OBSERVADOR, id=8)
    result = _run("save-same-title", {"articles": [OBSERVADOR, other]}, tmp_path)
    assert sorted(row["sourceArticleId"] for row in result["rows"]) == [7, 8]


def test_publico_article_keeps_publico_newspaper(tmp_path: Path) -> None:
    result = _run("newspaper", {"article": PUBLICO}, tmp_path)
    assert result["articleNewspaper"] == "PUBLICO"
    assert result["newspaperSaves"] == [{"name": "PUBLICO"}]


def test_observador_script_saves_a_missing_source_id_once(tmp_path: Path) -> None:
    result = _run("script", {"mostRecentId": 1, "articles": [OBSERVADOR]}, tmp_path)
    assert len(result["rows"]) == 1
    assert result["rows"][0]["sourceArticleId"] == 7


def test_produced_messages_carry_outlet_and_source_id(tmp_path: Path) -> None:
    result = _run("produce", {"publico": PUBLICO, "observador": OBSERVADOR}, tmp_path)
    assert result["publico"]["sourceArticleId"] == 42
    assert result["publico"]["outlet"] == "PUBLICO"
    assert result["publico"]["url"] == PUBLICO["url"]
    assert result["observador"]["sourceArticleId"] == 7
    assert result["observador"]["outlet"] == "OBSERVADOR"
