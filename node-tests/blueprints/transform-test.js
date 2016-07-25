var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: generate and destroy transform blueprints', function() {
  setupTestHooks(this);

  it('transform', function() {
    return generateAndDestroy(['transform', 'foo'], {
      files: [
        {
          file: 'app/transforms/foo.js',
          contains: [
            'import DS from \'ember-data\';',
            'export default DS.Transform.extend(',
            'deserialize(serialized) {',
            'serialize(deserialized) {'
          ]
        },
        {
          file: 'tests/unit/transforms/foo-test.js',
          contains: [
            'moduleFor(\'transform:foo\''
          ]
        }
      ]
    });
  });

  it('transforms-test', function() {
    return generateAndDestroy(['transform-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/transforms/foo-test.js',
          contains: [
            'moduleFor(\'transform:foo\''
          ]
        }
      ]
    });
  });
});
