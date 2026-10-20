---
releases: ["5.10"]
---
A new cookbook recipe walks a test suite off ember-cli-mirage or miragejs and onto Holodeck one
test at a time. It converts a first test, maps the Mirage patterns a migrator meets next
(factories, `POST` bodies, query strings, error responses, request assertions, repeated endpoints,
legacy adapters) onto Holodeck mocks, lists the Mirage features with no counterpart, and ends with
a suite-wide order of work and a list of frequent issues indexed by their symptoms. See
[Migrating from Mirage to Holodeck](/guides/the-manual/cookbook/migrate-from-mirage-to-holodeck.md).
