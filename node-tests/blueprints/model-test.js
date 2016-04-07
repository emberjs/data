var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: generate and destroy model blueprints', function() {
  setupTestHooks(this);

  it('model', function() {
    var args = ['model', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/models/foo.js'))
          .to.contain('import Model from \'ember-data/model\';')
          .to.contain('export default Model.extend(')
          .to.not.contain('import attr from \'ember-data/attr\';')
          .to.not.contain('import { belongsTo } from \'ember-data/relationships\';')
          .to.not.contain('import { hasMany } from \'ember-data/relationships\';')
          .to.not.contain('import { belongsTo, hasMany } from \'ember-data/relationships\';');

        expect(_file('tests/unit/models/foo-test.js'))
          .to.contain('moduleForModel(\'foo\'');
      }));
  });

  it('model with attrs', function() {
    var args = [
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
    ];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/models/foo.js'))
          .to.contain('import Model from \'ember-data/model\';')
          .to.contain('import attr from \'ember-data/attr\';')
          .to.contain('export default Model.extend(')
          .to.contain('misc: attr()')
          .to.contain('skills: attr(\'array\')')
          .to.contain('isActive: attr(\'boolean\')')
          .to.contain('birthday: attr(\'date\')')
          .to.contain('someObject: attr(\'object\')')
          .to.contain('age: attr(\'number\')')
          .to.contain('name: attr(\'string\')')
          .to.contain('customAttr: attr(\'custom-transform\')')
          .to.not.contain('import { belongsTo } from \'ember-data/relationships\';')
          .to.not.contain('import { hasMany } from \'ember-data/relationships\';')
          .to.not.contain('import { belongsTo, hasMany } from \'ember-data/relationships\';');

        expect(_file('tests/unit/models/foo-test.js'))
          .to.contain('moduleForModel(\'foo\'');
      }));
  });

  it('model with belongsTo', function() {
    var args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/models/comment.js'))
          .to.contain('import Model from \'ember-data/model\';')
          .to.contain('import { belongsTo } from \'ember-data/relationships\';')
          .to.contain('export default Model.extend(')
          .to.contain('post: belongsTo(\'post\')')
          .to.contain('author: belongsTo(\'user\')')
          .to.not.contain('import attr from \'ember-data/attr\';')
          .to.not.contain('import { hasMany } from \'ember-data/relationships\';')
          .to.not.contain('import { belongsTo, hasMany } from \'ember-data/relationships\';');

        expect(_file('tests/unit/models/comment-test.js'))
          .to.contain('moduleForModel(\'comment\'')
          .to.contain('needs: [\'model:post\', \'model:user\']');
      }));
  });

  it('model with hasMany', function() {
    var args = ['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/models/post.js'))
          .to.contain('import Model from \'ember-data/model\';')
          .to.contain('import { hasMany } from \'ember-data/relationships\';')
          .to.contain('export default Model.extend(')
          .to.contain('comments: hasMany(\'comment\')')
          .to.contain('otherComments: hasMany(\'comment\')')
          .to.not.contain('import attr from \'ember-data/attr\';')
          .to.not.contain('import { belongsTo } from \'ember-data/relationships\';')
          .to.not.contain('import { belongsTo, hasMany } from \'ember-data/relationships\';');

        expect(_file('tests/unit/models/post-test.js'))
          .to.contain('moduleForModel(\'post\'')
          .to.contain('needs: [\'model:comment\']');
      }));
  });

  it('model with belongsTo and hasMany has both imports', function() {
    var args = ['model', 'post', 'comments:has-many', 'user:belongs-to'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/models/post.js'))
          .to.contain('import { belongsTo, hasMany } from \'ember-data/relationships\';')
          .to.not.contain('import attr from \'ember-data/attr\';')
          .to.not.contain('import { belongsTo } from \'ember-data/relationships\';')
          .to.not.contain('import { hasMany } from \'ember-data/relationships\';');
      }));
  });

  it('model-test', function() {
    var args = ['model-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/models/foo-test.js'))
          .to.contain('moduleForModel(\'foo\'');
      }));
  });

  it('model-test for mocha', function() {
    var args = ['model-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        {name: 'ember-cli-qunit', delete: true},
        {name: 'ember-cli-mocha', dev: true}
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/models/foo-test.js'))
          .to.contain('import { describeModel, it } from \'ember-mocha\';')
          .to.contain('describeModel(\n  \'foo\',')
          .to.contain('expect(model).to.be.ok;');
      }));
  });
});
