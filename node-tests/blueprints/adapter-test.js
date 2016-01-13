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

  it('adapter with --base-class', function() {
    return generateAndDestroy(['adapter', 'foo', '--base-class=bar'], {
      files: [
        {
          file: 'app/adapters/foo.js',
          contains: [
            'import BarAdapter from \'./bar\';',
            'export default BarAdapter.extend({'
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

  it('adapter throws when --base-class is same as name', function() {
    return generateAndDestroy(['adapter', 'application', '--base-class=application'], {
      throws: {
        message: /Adapters cannot extend from themself/,
        type: 'SilentError'
      }
    });
  });

  it('adapter when is named "application"', function() {
    return generateAndDestroy(['adapter', 'application'], {
      files: [
        {
          file: 'app/adapters/application.js',
          contains: [
            'import JSONAPIAdapter from \'ember-data/adapters/json-api\';',
            'export default JSONAPIAdapter.extend({'
          ]
        },
        {
          file: 'tests/unit/adapters/application-test.js',
          contains: [
            'moduleFor(\'adapter:application\''
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
