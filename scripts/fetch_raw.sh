#!/bin/sh
# Materialise data/raw/publico.json and data/raw/observador.json.
# The recorded fixtures are the source: this repo has no stable public dump.
# Pass --from DIR to copy DIR/publico.json and DIR/observador.json instead.
set -eu

repo_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
if [ -n "${RESEARCH:-}" ]; then
  dest="$RESEARCH/media_networks_polarisation/data/raw"
else
  dest="$repo_root/data/raw"
fi
mkdir -p "$dest"

if [ "${1:-}" = "--from" ]; then
  if [ -z "${2:-}" ]; then
    echo "usage: scripts/fetch_raw.sh [--from DIR]" >&2
    exit 1
  fi
  publico_src="$2/publico.json"
  observador_src="$2/observador.json"
else
  publico_src="$repo_root/tests/fixtures/etl/clean-publico/data/raw/publico.json"
  observador_src="$repo_root/tests/fixtures/etl/clean-observador/data/raw/observador.json"
fi

cp "$publico_src" "$dest/publico.json"
cp "$observador_src" "$dest/observador.json"
