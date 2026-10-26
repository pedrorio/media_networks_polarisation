# Tasks

## 1. Identity and mapping

- [ ] 1.1 Put outlet and source article id on the article entity and on produced article messages, and verify a mapper test reads both fields back
- [ ] 1.2 Keep transformed title, text, date, tags, authors, and newspaper through `toArticle`, and verify a unit test that none of those fields are undefined

## 2. Writes

- [ ] 2.1 Save Observador articles when the source id is absent, and verify an empty lookup inserts exactly one row
- [ ] 2.2 Make a second save of the same Público or Observador source id a no-op, and verify the row count stays 1
- [ ] 2.3 Link the newspaper named by the transform, inserting it when missing, and verify a Público article does not become OBSERVADOR
- [ ] 2.4 Apply the same missing-row check in `loader/scripts/observador.ts` and verify the script's guard matches the handler
