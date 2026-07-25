# Fixtures

Each JSON file describes one or more candidate groups and the expected legality
under Quantum Cubes Foundation Rules v0.1.

Schema:

```json
{
  "name": "human readable name",
  "expectLegal": true,
  "groups": [
    { "tiles": [{ "family": "spark", "value": 3 }, ...] }
  ]
}
```

- Files in `legal-layouts/` must have every group valid.
- Files in `illegal-layouts/` must have at least one invalid group.

`tests/fixtures.test.ts` loads **every** JSON file under this directory and
asserts its groups validate as expected.
