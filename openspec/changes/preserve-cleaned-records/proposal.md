# Proposal

## Why

Both clean scripts write jq output to `data/clean/<outlet>.json` and then run `sed ... file > file`. The shell truncates the file before sed reads it, so the cleaned corpus is always empty and the later join has nothing to read. No command in the repo writes the `data/raw` files those scripts expect, so a fresh checkout cannot produce them either.

## What Changes

- Strip HTML without truncating the jq output, and leave the cleaned JSON documents on disk.
- Add a command that writes `data/raw/publico.json` and `data/raw/observador.json` in the shape the clean filters already read.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `file-etl`: The clean step keeps its documents, and a command creates the raw files.

## Impact

- `scripts/wrangle/cleanRawData/publico.sh` and `observador.sh`.
- A new fetch or export script. The jq filters themselves stay.
