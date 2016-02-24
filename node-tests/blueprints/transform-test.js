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
            'import Transform from \'ember-data/transform\';',
            'export default Transform.extend(',
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

  it('transform-test for mocha', function() {
    return generateAndDestroy(['transform-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/transforms/foo-test.js',
          contains: [
            'import { describeModule, it } from \'ember-mocha\';',
            'describeModule(\n  \'transform:foo\',',
            'expect(transform).to.be.ok;'
          ]
        }
      ]
    });
  });
});
