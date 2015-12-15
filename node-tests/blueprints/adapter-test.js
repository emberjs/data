var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: generate and destroy adapter blueprints', function() {
  setupTestHooks(this);

  it('adapter', function() {
    return generateAndDestroy(['adapter', 'foo'], {
      files: [
        {
          file: 'app/adapters/foo.js',
          contains: [
            'import ApplicationAdapter from \'./application\';',
            'export default ApplicationAdapter.extend({'
          ]
        },
        {
          file: 'tests/unit/adapters/foo-test.js',
          contains: [
            'moduleFor(\'adapter:foo\''
          ]
        }
      ]
    });
  });

  it('adapter-test', function() {
    return generateAndDestroy(['adapter-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/adapters/foo-test.js',
          contains: [
            'moduleFor(\'adapter:foo\''
          ]
        }
      ]
    });
  });
});
