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
            'import Model from \'ember-data/model\';',
            'export default Model.extend('
          ],
          doesNotContain: [
            'import attr from \'ember-data/attr\';',
            'import { belongsTo } from \'ember-data/relationships\';',
            'import { hasMany } from \'ember-data/relationships\';',
            'import { belongsTo, hasMany } from \'ember-data/relationships\';'
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
            'import Model from \'ember-data/model\';',
            'import attr from \'ember-data/attr\';',
            'export default Model.extend(',
            'misc: attr()',
            'skills: attr(\'array\')',
            'isActive: attr(\'boolean\')',
            'birthday: attr(\'date\')',
            'someObject: attr(\'object\')',
            'age: attr(\'number\')',
            'name: attr(\'string\')',
            'customAttr: attr(\'custom-transform\')'
          ],
          doesNotContain: [
            'import { belongsTo } from \'ember-data/relationships\';',
            'import { hasMany } from \'ember-data/relationships\';',
            'import { belongsTo, hasMany } from \'ember-data/relationships\';'
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
            'import Model from \'ember-data/model\';',
            'import { belongsTo } from \'ember-data/relationships\';',
            'export default Model.extend(',
            'post: belongsTo(\'post\')',
            'author: belongsTo(\'user\')',
          ],
          doesNotContain: [
            'import attr from \'ember-data/attr\';',
            'import { hasMany } from \'ember-data/relationships\';',
            'import { belongsTo, hasMany } from \'ember-data/relationships\';'
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
            'import Model from \'ember-data/model\';',
            'import { hasMany } from \'ember-data/relationships\';',
            'export default Model.extend(',
            'comments: hasMany(\'comment\')',
            'otherComments: hasMany(\'comment\')',
          ],
          doesNotContain: [
            'import attr from \'ember-data/attr\';',
            'import { belongsTo } from \'ember-data/relationships\';',
            'import { belongsTo, hasMany } from \'ember-data/relationships\';'
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

  it('model with belongsTo and hasMany has both imports', function() {
    return generateAndDestroy(['model', 'post', 'comments:has-many', 'user:belongs-to'], {
      files: [
        {
          file: 'app/models/post.js',
          contains: [
            'import { belongsTo, hasMany } from \'ember-data/relationships\';'
          ],
          doesNotContain: [
            'import attr from \'ember-data/attr\';',
            'import { belongsTo } from \'ember-data/relationships\';',
            'import { hasMany } from \'ember-data/relationships\';'
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
