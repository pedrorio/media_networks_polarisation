# File ETL

## Purpose

How the Airflow DAG files and the jq wrangle scripts turn on-disk JSON into TSV, and the retries those DAG files declare. This path does not run inside the Kafka services.

## Requirements

### Requirement: Airflow files are not a deployed scheduler
pipelines/etl_news.py and pipelines/retrieve_news.py SHALL be the only Airflow definitions in the repo. Nothing in the Kubernetes manifests or Skaffold config SHALL start Airflow. The airflow directory SHALL stay gitignored. The DAG settings SHALL apply only when an external scheduler loads those files.

#### Scenario: Cluster from the checked-in manifests
- **WHEN** someone applies the Kubernetes base
- **THEN** no Airflow scheduler, webserver, or worker workload is declared

### Requirement: DAG retry and timeout settings
Each DAG SHALL set retries to 2, retry_delay to 5 minutes, sla to 90 minutes, dagrun_timeout to 180 minutes, schedule_interval to hourly, start_date to 2020-07-01, and catchup to false. The shell scripts those tasks call SHALL NOT themselves retry. The commented email operators and the commented file sensor SHALL NOT run.

#### Scenario: External run of etl_news fails
- **WHEN** an external Airflow scheduler runs etl_news and the bash task fails
- **THEN** Airflow retries that task twice, five minutes apart
- **AND** the jq script does not contain its own retry loop

#### Scenario: Dag run exceeds three hours
- **WHEN** a dag run is still active after 180 minutes
- **THEN** the DAG's dagrun_timeout applies

### Requirement: Retrieve DAG runs the sequential scripts
The retrieve_news DAG SHALL bash out to ts-node on loader/scripts/publico.ts and loader/scripts/observador.ts under $RESEARCH/media_networks_polarisation. It SHALL NOT start the Kafka manager or worker.

#### Scenario: retrieve_newspaper_data
- **WHEN** the retrieve task runs with NEWS_OUTLETS publico and observador
- **THEN** it executes the Público script and then the Observador script
- **AND** it does not produce Kafka seed messages

### Requirement: Sequential scripts do not write raw files
The sequential scripts SHALL fetch live Público and Observador HTTP endpoints and SHALL save through TypeORM. They SHALL NOT write data/raw/publico.json or data/raw/observador.json.

#### Scenario: Sequential Público run
- **WHEN** loader/scripts/publico.ts finishes a page
- **THEN** its writes are repository saves
- **AND** data/raw is unchanged by that script

### Requirement: ETL DAG runs the wrangle scripts
The etl_news DAG SHALL run, in order, cleanRawData for publico and observador, createHeaders.sh, joinData.sh, and integrateData.sh. Each command SHALL be sh under $RESEARCH/media_networks_polarisation. The task chain SHALL be start, clean_raw_data, create_headers, join_clean_data, integrate_composite_data, stop.

#### Scenario: Happy-path task order
- **WHEN** etl_news runs
- **THEN** clean_raw_data is upstream of create_headers
- **AND** create_headers is upstream of join_clean_data
- **AND** join_clean_data is upstream of integrate_composite_data

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

### Requirement: Clean jq filters use the raw outlet fields
The Público jq filter SHALL read titulo, texto, data, url, tags[].nome, and autores[].contribuicao, and SHALL keep text authors only. The Observador jq filter SHALL read fullTitle, links.webUri, body, pubDate, and metadata topics and authors whose creditType array contains text. Both filters SHALL drop records missing text, date, authors, or tags. This jq output is what the clean script produces before the sed redirection erases it.

#### Scenario: Público tag field
- **WHEN** the Público jq filter sees a tag with nome and no name
- **THEN** the emitted tag name is that nome

#### Scenario: Observador non-text credit
- **WHEN** an Observador author's creditType array is ["photo"]
- **THEN** that author is not emitted

### Requirement: Header script writes fixed TSV headers
createHeaders.sh SHALL overwrite the seven header files articles, tags, authors, newspapers, tagged, wrote, and published under data/headers. Each file SHALL be the jq TSV of a fixed list of column names. The script SHALL NOT read article bodies.

#### Scenario: Header generation
- **WHEN** createHeaders.sh runs
- **THEN** data/headers/articles.tsv is the TSV row title, url, text, date
- **AND** data/headers/tagged.tsv is the TSV row article, tag

### Requirement: Join concatenates clean JSON values
joinData.sh SHALL replace data/composite/data.json with jq's array of every JSON value in data/clean/*.json, in the shell's glob order. It SHALL NOT deduplicate across files.

#### Scenario: Two clean files
- **WHEN** data/clean contains observador.json and publico.json
- **THEN** data/composite/data.json is a JSON array of their values
- **AND** with LC_ALL=C the Observador values come first

### Requirement: Integrate writes one TSV per relation
integrateData.sh SHALL read data/composite/data.json and SHALL write articles, tags, authors, newspapers, tagged, wrote, and published TSV files under data/integrated. Tags and authors SHALL be uniqued by name. Newspaper, tagged, wrote, and published rows SHALL NOT be uniqued. Rows SHALL be tab-separated title, url, text, and date for articles.

#### Scenario: Two articles in one newspaper
- **WHEN** the composite array has two articles that both name Público
- **THEN** newspapers.tsv has two Público lines
- **AND** tags.tsv lists each distinct tag name once

### Requirement: A command writes the raw files the clean step reads
The repo SHALL contain a command that writes data/raw/publico.json and data/raw/observador.json as JSON arrays in the shape the clean jq filters read. The clean step SHALL be able to follow that command without a hand-placed file.

#### Scenario: Fresh checkout
- **WHEN** that command is run on a checkout that has no raw files
- **THEN** both raw JSON arrays exist
- **AND** the clean jq filters can read them
