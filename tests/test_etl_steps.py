"""Golden tests for the jq wrangle scripts.

Each test runs one script against a checked-in fixture. The clean goldens are
the jq documents after HTML tags are stripped through a temporary file.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
FIXTURES = REPO / "tests" / "fixtures" / "etl"
GOLDEN = REPO / "tests" / "golden" / "etl"

HEADER_FILES = (
    "articles.tsv",
    "tags.tsv",
    "authors.tsv",
    "newspapers.tsv",
    "tagged.tsv",
    "wrote.tsv",
    "published.tsv",
)

INTEGRATED_FILES = (
    "articles.tsv",
    "tags.tsv",
    "authors.tsv",
    "newspapers.tsv",
    "tagged.tsv",
    "wrote.tsv",
    "published.tsv",
)


def _run(script: str, fixture: Path | None, tmp_path: Path) -> Path:
    research = tmp_path / "research"
    project = research / "media_networks_polarisation"
    data = project / "data"
    for sub in ("raw", "clean", "headers", "composite", "integrated"):
        (data / sub).mkdir(parents=True)
    if fixture is not None:
        fixture_data = fixture / "data"
        for path in fixture_data.rglob("*"):
            if path.is_file():
                dest = data / path.relative_to(fixture_data)
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(path, dest)
    env = os.environ.copy()
    env["RESEARCH"] = str(research)
    env["LC_ALL"] = "C"
    completed = subprocess.run(
        ["sh", str(REPO / script)],
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(
            f"{script} exited {completed.returncode}\n{completed.stdout}\n{completed.stderr}"
        )
    return data


def test_fetch_raw_writes_arrays_the_clean_step_reads(tmp_path: Path) -> None:
    research = tmp_path / "research"
    project = research / "media_networks_polarisation"
    (project / "data" / "clean").mkdir(parents=True)
    env = os.environ.copy()
    env["RESEARCH"] = str(research)
    env["LC_ALL"] = "C"
    completed = subprocess.run(
        ["sh", str(REPO / "scripts" / "fetch_raw.sh")],
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        pytest.fail(f"fetch_raw.sh exited {completed.returncode}\n{completed.stderr}")
    raw = project / "data" / "raw"
    for name in ("publico.json", "observador.json"):
        payload = (raw / name).read_text()
        assert payload.startswith("[")
    cleaned_run = subprocess.run(
        ["sh", str(REPO / "scripts" / "wrangle" / "cleanRawData" / "publico.sh")],
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if cleaned_run.returncode != 0:
        pytest.fail(cleaned_run.stderr)
    cleaned = (project / "data" / "clean" / "publico.json").read_text()
    assert "Olá mundo" in cleaned
    assert "<b>" not in cleaned


def test_clean_publico_matches_golden(tmp_path: Path) -> None:
    data = _run(
        "scripts/wrangle/cleanRawData/publico.sh",
        FIXTURES / "clean-publico",
        tmp_path,
    )
    assert (data / "clean" / "publico.json").read_bytes() == (
        GOLDEN / "clean" / "publico.json"
    ).read_bytes()


def test_clean_observador_matches_golden(tmp_path: Path) -> None:
    data = _run(
        "scripts/wrangle/cleanRawData/observador.sh",
        FIXTURES / "clean-observador",
        tmp_path,
    )
    assert (data / "clean" / "observador.json").read_bytes() == (
        GOLDEN / "clean" / "observador.json"
    ).read_bytes()


def test_create_headers_matches_golden(tmp_path: Path) -> None:
    data = _run("scripts/wrangle/createHeaders.sh", None, tmp_path)
    for name in HEADER_FILES:
        assert (data / "headers" / name).read_bytes() == (GOLDEN / "headers" / name).read_bytes()


def test_join_clean_data_matches_golden(tmp_path: Path) -> None:
    data = _run("scripts/wrangle/joinData.sh", FIXTURES / "join", tmp_path)
    assert (data / "composite" / "data.json").read_bytes() == (
        GOLDEN / "join" / "data.json"
    ).read_bytes()


def test_integrate_composite_data_matches_golden(tmp_path: Path) -> None:
    data = _run("scripts/wrangle/integrateData.sh", FIXTURES / "integrate", tmp_path)
    for name in INTEGRATED_FILES:
        assert (data / "integrated" / name).read_bytes() == (
            GOLDEN / "integrate" / name
        ).read_bytes()
