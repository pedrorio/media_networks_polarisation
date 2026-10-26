# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Clean scripts erase the jq output`
- TO: `### Requirement: Clean scripts keep the jq documents`
- FROM: `### Requirement: No code writes the raw files the clean step reads`
- TO: `### Requirement: A command writes the raw files the clean step reads`

## MODIFIED Requirements

### Requirement: Clean scripts keep the jq documents
Each clean script SHALL write the jq documents to data/clean/<outlet>.json and SHALL strip HTML tags from that text without truncating the file first. The cleaned file SHALL contain those documents. It SHALL NOT be empty when jq emitted any.

#### Scenario: Público clean
- **WHEN** cleanRawData/publico.sh runs against a non-empty raw array that jq keeps
- **THEN** data/clean/publico.json contains those jq documents
- **AND** its size is greater than 0

#### Scenario: Observador clean
- **WHEN** cleanRawData/observador.sh runs against a non-empty raw array that jq keeps
- **THEN** data/clean/observador.json contains those jq documents
- **AND** its size is greater than 0

### Requirement: A command writes the raw files the clean step reads
The repo SHALL contain a command that writes data/raw/publico.json and data/raw/observador.json as JSON arrays in the shape the clean jq filters read. The clean step SHALL be able to follow that command without a hand-placed file.

#### Scenario: Fresh checkout
- **WHEN** that command is run on a checkout that has no raw files
- **THEN** both raw JSON arrays exist
- **AND** the clean jq filters can read them
