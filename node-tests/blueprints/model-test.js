var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: generate and destroy model blueprints', function() {
  setupTestHooks(this);

  it('model', function() {
    return generateAndDestroy(['model', 'foo'], {
      files: [
        {
          file: 'app/models/foo.js',
          contains: [
            'import DS from \'ember-data\';',
            'export default DS.Model.extend('
          ]
        },
        {
          file: 'tests/unit/models/foo-test.js',
          contains: [
            'moduleForModel(\'foo\''
          ]
        }
      ]
    });
  });

  it('model with attrs', function() {
    return generateAndDestroy([
      'model',
      'foo',
      'misc',
      'skills:array',
      'isActive:boolean',
      'birthday:date',
      'someObject:object',
      'age:number',
      'name:string',
      'customAttr:custom-transform'
    ], {
      files: [
        {
          file: 'app/models/foo.js',
          contains: [
            'import DS from \'ember-data\';',
            'export default DS.Model.extend(',
            'misc: DS.attr()',
            'skills: DS.attr(\'array\')',
            'isActive: DS.attr(\'boolean\')',
            'birthday: DS.attr(\'date\')',
            'someObject: DS.attr(\'object\')',
            'age: DS.attr(\'number\')',
            'name: DS.attr(\'string\')',
            'customAttr: DS.attr(\'custom-transform\')'
          ]
        },
        {
          file: 'tests/unit/models/foo-test.js',
          contains: [
            'moduleForModel(\'foo\''
          ]
        }
      ]
    });
  });

  it('model with belongsTo', function() {
    return generateAndDestroy(['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'], {
      files: [
        {
          file: 'app/models/comment.js',
          contains: [
            'import DS from \'ember-data\';',
            'export default DS.Model.extend(',
            'post: DS.belongsTo(\'post\')',
            'author: DS.belongsTo(\'user\')',
          ]
        },
        {
          file: 'tests/unit/models/comment-test.js',
          contains: [
            'moduleForModel(\'comment\'',
            'needs: [\'model:post\', \'model:user\']'
          ]
        }
      ]
    });
  });

  it('model with hasMany', function() {
    return generateAndDestroy(['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'], {
      files: [
        {
          file: 'app/models/post.js',
          contains: [
            'import DS from \'ember-data\';',
            'export default DS.Model.extend(',
            'comments: DS.hasMany(\'comment\')',
            'otherComments: DS.hasMany(\'comment\')',
          ]
        },
        {
          file: 'tests/unit/models/post-test.js',
          contains: [
            'moduleForModel(\'post\'',
            'needs: [\'model:comment\']'
          ]
        }
      ]
    });
  });

  it('model-test', function() {
    return generateAndDestroy(['model-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/models/foo-test.js',
          contains: [
            'moduleForModel(\'foo\''
          ]
        }
      ]
    });
  });
});
