"""Público crawl payload contract between the worker and the manager."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
TS_NODE = REPO / "loader" / "node_modules" / ".bin" / "ts-node"
RUNNER = REPO / "tests" / "support" / "run_publico_payloads.ts"

PAGE_ARTICLES = [
    {
        "titulo": "Primeira",
        "data": "2020-08-01",
        "texto": None,
        "url": "/2020/08/01/primeira",
        "tags": [],
        "autores": [],
    },
    {
        "titulo": "Segunda",
        "data": "2020-08-02",
        "texto": None,
        "url": "/2020/08/02/segunda",
        "tags": [],
        "autores": [],
    },
    {
        "titulo": "Terceira",
        "data": "2020-08-03",
        "texto": None,
        "url": "/2020/08/03/terceira",
        "tags": [],
        "autores": [],
    },
]


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


def test_page_fetch_emits_one_array_message(tmp_path: Path) -> None:
    result = _run("page", {"pageNumber": "12", "articles": PAGE_ARTICLES}, tmp_path)
    assert result["requestedPage"] == 12
    assert len(result["sends"]) == 1
    messages = result["sends"][0]["messages"]
    assert result["sends"][0]["topic"] == "PUBLICO"
    assert len(messages) == 1
    assert messages[0]["key"] == "PAGE_DATA"
    assert messages[0]["value"] == PAGE_ARTICLES


def test_article_fetch_requests_the_fixture_url(tmp_path: Path) -> None:
    article = PAGE_ARTICLES[0]
    result = _run("article", article, tmp_path)
    assert result["requestedUrl"] == "https://www.publico.pt/2020/08/01/primeira"
    assert len(result["sends"]) == 1
    messages = result["sends"][0]["messages"]
    assert len(messages) == 1
    assert messages[0]["key"] == "ARTICLE_DATA"
    assert messages[0]["value"]["url"] == article["url"]
    assert "Corpo" in messages[0]["value"]["texto"]


def test_manager_enqueues_one_retrieve_per_new_title(tmp_path: Path) -> None:
    page = _run("page", {"pageNumber": "12", "articles": PAGE_ARTICLES}, tmp_path)
    page_value = json.dumps(page["sends"][0]["messages"][0]["value"])
    result = _run(
        "manager",
        {"pageValue": page_value, "existingTitles": ["Segunda"]},
        tmp_path,
    )
    assert len(result["sends"]) == 1
    messages = result["sends"][0]["messages"]
    assert result["sends"][0]["topic"] == "PUBLICO"
    assert [item["key"] for item in messages] == ["RETRIEVE_ARTICLE", "RETRIEVE_ARTICLE"]
    assert [item["value"]["titulo"] for item in messages] == ["Primeira", "Terceira"]
    assert [item["value"]["url"] for item in messages] == [
        "/2020/08/01/primeira",
        "/2020/08/03/terceira",
    ]
