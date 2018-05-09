'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Acceptance: generate and destroy model blueprints', function() {
  setupTestHooks(this);

  beforeEach(function() {
    return emberNew();
  });

  it('model', function() {
    let args = ['model', 'foo'];

    return emberGenerateDestroy(args, _file => {
      expect(_file('app/models/foo.js'))
        .to.contain("import DS from 'ember-data';")
        .to.contain('export default DS.Model.extend(');

      expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture('model-test/foo-default.js'));
    });
  });

  it('model with attrs', function() {
    let args = [
      'model',
      'foo',
      'misc',
      'skills:array',
      'isActive:boolean',
      'birthday:date',
      'someObject:object',
      'age:number',
      'name:string',
      'customAttr:custom-transform',
    ];

    return emberGenerateDestroy(args, _file => {
      expect(_file('app/models/foo.js'))
        .to.contain("import DS from 'ember-data';")
        .to.contain('export default DS.Model.extend(')
        .to.contain('misc: DS.attr()')
        .to.contain("skills: DS.attr('array')")
        .to.contain("isActive: DS.attr('boolean')")
        .to.contain("birthday: DS.attr('date')")
        .to.contain("someObject: DS.attr('object')")
        .to.contain("age: DS.attr('number')")
        .to.contain("name: DS.attr('string')")
        .to.contain("customAttr: DS.attr('custom-transform')");

      expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture('model-test/foo-default.js'));
    });
  });

  it('model with belongsTo', function() {
    let args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

    return emberGenerateDestroy(args, _file => {
      expect(_file('app/models/comment.js'))
        .to.contain("import DS from 'ember-data';")
        .to.contain('export default DS.Model.extend(')
        .to.contain("post: DS.belongsTo('post')")
        .to.contain("author: DS.belongsTo('user')");

      expect(_file('tests/unit/models/comment-test.js')).to.equal(
        fixture('model-test/comment-default.js')
      );
    });
  });

  it('model with hasMany', function() {
    let args = ['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'];

    return emberGenerateDestroy(args, _file => {
      expect(_file('app/models/post.js'))
        .to.contain("import DS from 'ember-data';")
        .to.contain('export default DS.Model.extend(')
        .to.contain("comments: DS.hasMany('comment')")
        .to.contain("otherComments: DS.hasMany('comment')");

      expect(_file('tests/unit/models/post-test.js')).to.equal(
        fixture('model-test/post-default.js')
      );
    });
  });

  it('model-test', function() {
    let args = ['model-test', 'foo'];

    return emberGenerateDestroy(args, _file => {
      expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture('model-test/foo-default.js'));
    });
  });

  describe('model-test with ember-cli-qunit@4.2.0', function() {
    beforeEach(function() {
      generateFakePackageManifest('ember-cli-qunit', '4.2.0');
    });

    it('model-test-test foo', function() {
      return emberGenerateDestroy(['model-test', 'foo'], _file => {
        expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture('model-test/rfc232.js'));
      });
    });
  });

  describe('with ember-cli-mocha v0.12+', function() {
    beforeEach(function() {
      modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true },
      ]);
      generateFakePackageManifest('ember-cli-mocha', '0.12.0');
    });

    it('model-test for mocha v0.12+', function() {
      let args = ['model-test', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/models/foo-test.js')).to.equal(
          fixture('model-test/foo-mocha-0.12.js')
        );
      });
    });
  });
});
