## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

To add a new feature flag or change an existing one, you can add an
entry in `config/features.json`.

**Ember Data features flags must begin with `ds-`, such as
`ds-new-coalescing`.**

## Feature Flags

- `ds-finder-include`

  Allows an `include` query parameter to be specified with using
  `store.findRecord()` and `store.findAll()` as described in [RFC
  99](https://github.com/emberjs/rfcs/pull/99)

- `ds-references`

  Adds references as described in [RFC 57](https://github.com/emberjs/rfcs/pull/57)
