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
            'import DS from \'ember-data\';',
            'export default DS.RESTSerializer.extend('
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
});
