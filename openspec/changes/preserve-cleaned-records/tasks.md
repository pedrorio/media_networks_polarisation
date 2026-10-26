# Tasks

## 1. Clean output

- [ ] 1.1 Redirect sed through a temporary file in both clean scripts and verify the Público and Observador golden files are the non-empty jq documents
- [ ] 1.2 Strip HTML tags inside that output and verify a fixture containing `<b>` keeps the inner text

## 2. Raw files

- [ ] 2.1 Add a command that writes both raw JSON arrays in the clean-filter shape and verify it on a fixture or a recorded response, with no cluster
- [ ] 2.2 Point the README at that command and verify the README path matches the script path
