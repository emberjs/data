# performance-test-app

Macro (App Like) Performance Regression Tests

Runs automatically in CI. For local usage see [@ember-performance-monitoring/tracerbench-compare-action](https://github.com/ember-performance-monitoring/tracerbench-compare-action)

## adding extra tests

- create a new route
- in the `model` hook add markers where appropriate `performance.mark`
- you can add `performance.measure` calls to visualize some markers in chrome performance view
- in the `afterModel` hook call `endTrace` to stop tracing
- modify `<root>.github/workflows/perf-check.yml` to include the new route and its markers
