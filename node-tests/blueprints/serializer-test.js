var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: generate and destroy serializer blueprints', function() {
  setupTestHooks(this);

  it('serializer', function() {
    return generateAndDestroy(['serializer', 'foo'], {
      files: [
        {
          file: 'app/serializers/foo.js',
          contains: [
            'import JSONAPISerializer from \'ember-data/serializers/json-api\';',
            'export default JSONAPISerializer.extend('
          ]
        },
        {
          file: 'tests/unit/serializers/foo-test.js',
          contains: [
            'moduleForModel(\'foo\''
          ]
        }
      ]
    });
  });

  it('serializer extends application serializer if it exists', function() {
    return generateAndDestroy(['serializer', 'application'], {
      afterGenerate: function() {
        return generateAndDestroy(['serializer', 'foo'], {
          skipInit: true,
          files: [
            {
              file: 'app/serializers/foo.js',
              contains: [
                'import ApplicationSerializer from \'./application\';',
                'export default ApplicationSerializer.extend({'
              ]
            },
            {
              file: 'tests/unit/serializers/foo-test.js',
              contains: [
                'moduleForModel(\'foo\''
              ]
            }
          ]
        });
      }
    });
  });

  it('serializer with --base-class', function() {
    return generateAndDestroy(['serializer', 'foo', '--base-class=bar'], {
      files: [
        {
          file: 'app/serializers/foo.js',
          contains: [
            'import BarSerializer from \'./bar\';',
            'export default BarSerializer.extend({'
          ]
        },
        {
          file: 'tests/unit/serializers/foo-test.js',
          contains: [
            'moduleForModel(\'foo\''
          ]
        }
      ]
    });
  });

  it('serializer throws when --base-class is same as name', function() {
    return generateAndDestroy(['serializer', 'application', '--base-class=application'], {
      throws: {
        message: /Serializers cannot extend from themself/,
        type: 'SilentError'
      }
    });
  });

  it('serializer when is named "application"', function() {
    return generateAndDestroy(['serializer', 'application'], {
      files: [
        {
          file: 'app/serializers/application.js',
          contains: [
            'import JSONAPISerializer from \'ember-data/serializers/json-api\';',
            'export default JSONAPISerializer.extend({'
          ]
        },
        {
          file: 'tests/unit/serializers/application-test.js',
          contains: [
            'moduleForModel(\'application\''
          ]
        }
      ]
    });
  });

  it('serializer-test', function() {
    return generateAndDestroy(['serializer-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/serializers/foo-test.js',
          contains: [
            'moduleForModel(\'foo\''
          ]
        }
      ]
    });
  });

  it('serializer-test for mocha', function() {
    return generateAndDestroy(['serializer-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/serializers/foo-test.js',
          contains: [
            'import { describeModel, it } from \'ember-mocha\';',
            'describeModel(\n  \'foo\',',
            'Unit | Serializer | foo',
            'needs: [\'serializer:foo\']',
            'expect(serializedRecord).to.be.ok;'
          ]
        }
      ]
    });
  });
});
