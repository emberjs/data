var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

var generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');

describe('Acceptance: generate and destroy model blueprints', function() {
  setupTestHooks(this);

  it('model', function() {
    var args = ['model', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/models/foo.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.Model.extend(')

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
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.Model.extend(')
          .to.contain('misc: DS.attr()')
          .to.contain('skills: DS.attr(\'array\')')
          .to.contain('isActive: DS.attr(\'boolean\')')
          .to.contain('birthday: DS.attr(\'date\')')
          .to.contain('someObject: DS.attr(\'object\')')
          .to.contain('age: DS.attr(\'number\')')
          .to.contain('name: DS.attr(\'string\')')
          .to.contain('customAttr: DS.attr(\'custom-transform\')')

        expect(_file('tests/unit/models/foo-test.js'))
          .to.contain('moduleForModel(\'foo\'');
      }));
  });

  it('model with belongsTo', function() {
    var args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/models/comment.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.Model.extend(')
          .to.contain('post: DS.belongsTo(\'post\')')
          .to.contain('author: DS.belongsTo(\'user\')')

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
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.Model.extend(')
          .to.contain('comments: DS.hasMany(\'comment\')')
          .to.contain('otherComments: DS.hasMany(\'comment\')')

        expect(_file('tests/unit/models/post-test.js'))
          .to.contain('moduleForModel(\'post\'')
          .to.contain('needs: [\'model:comment\']');
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
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/models/foo-test.js'))
          .to.contain('import { describeModel, it } from \'ember-mocha\';')
          .to.contain('describeModel(\n  \'foo\',')
          .to.contain('expect(model).to.be.ok;');
      }));
  });

  it('model-test for mocha v0.12+', function() {
    var args = ['model-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        {name: 'ember-cli-qunit', delete: true},
        {name: 'ember-cli-mocha', dev: true}
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/models/foo-test.js'))
          .to.contain('import { describe, it } from \'mocha\';')
          .to.contain('import { setupModelTest } from \'ember-mocha\';')
          .to.contain('describe(\'Unit | Model | foo\', function() {')
          .to.contain('setupModelTest(\'foo\',')
          .to.contain('expect(model).to.be.ok;');
      }));
  });
});
