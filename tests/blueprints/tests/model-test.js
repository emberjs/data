'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const chai = require('ember-cli-blueprint-test-helpers/chai');

const path = require('path');
const fs = require('fs');
const file = require('ember-cli-blueprint-test-helpers/chai').file;

function fixture(directory, filePath) {
  return file(path.join(directory, '../fixtures', filePath));
}

function generateFakePackageManifest(name, version) {
  if (!fs.existsSync('node_modules')) {
    fs.mkdirSync('node_modules');
  }
  if (!fs.existsSync('node_modules/' + name)) {
    fs.mkdirSync('node_modules/' + name);
  }
  fs.writeFileSync(
    'node_modules/' + name + '/package.json',
    JSON.stringify({
      version: version,
    })
  );
}

const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const expect = chai.expect;
const { setEdition, clearEdition } = require('@ember/edition-utils');

function enableOctane() {
  beforeEach(function () {
    setEdition('octane');
  });

  afterEach(function () {
    clearEdition();
  });
}

function enableClassic() {
  beforeEach(function () {
    setEdition('classic');
  });

  afterEach(function () {
    clearEdition();
  });
}

describe('Acceptance: generate and destroy model blueprints', function () {
  setupTestHooks(this);

  describe('classic', function () {
    enableClassic();

    beforeEach(async function () {
      await emberNew();
      modifyPackages([{ name: '@ember-data/model', dev: true }]);
    });

    it('model', function () {
      const args = ['model', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/foo.js'))
          .to.contain(`import Model from '@ember-data/model';`)
          .to.contain('export default Model.extend(');

        expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/rfc232.js'));
      });
    });

    it('model with attrs', function () {
      const args = [
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

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/foo.js'))
          .to.contain(`import Model, { attr } from '@ember-data/model';`)
          .to.contain('export default Model.extend(')
          .to.contain('  misc: attr(),')
          .to.contain("  skills: attr('array'),")
          .to.contain("  isActive: attr('boolean'),")
          .to.contain("  birthday: attr('date'),")
          .to.contain("  someObject: attr('object'),")
          .to.contain("  age: attr('number'),")
          .to.contain("  name: attr('string'),")
          .to.contain("  customAttr: attr('custom-transform')");

        expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/rfc232.js'));
      });
    });

    it('model with belongsTo', function () {
      const args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/comment.js'))
          .to.contain(`import Model, { belongsTo } from '@ember-data/model';`)
          .to.contain('export default Model.extend(')
          .to.contain("  post: belongsTo('post', { async: false, inverse: null }),")
          .to.contain("  author: belongsTo('user', { async: false, inverse: null })");

        expect(_file('tests/unit/models/comment-test.js')).to.equal(
          fixture(__dirname, 'model-test/comment-default.js')
        );
      });
    });

    it('model with hasMany', function () {
      const args = ['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/post.js'))
          .to.contain(`import Model, { hasMany } from '@ember-data/model';`)
          .to.contain('export default Model.extend(')
          .to.contain("  comments: hasMany('comment', { async: false, inverse: null })")
          .to.contain("  otherComments: hasMany('comment', { async: false, inverse: null })");

        expect(_file('tests/unit/models/post-test.js')).to.equal(fixture(__dirname, 'model-test/post-default.js'));
      });
    });

    it('model-test', function () {
      const args = ['model-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/rfc232.js'));
      });
    });

    describe('model-test with ember-cli-qunit@4.1.0', function () {
      beforeEach(function () {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('model-test-test foo', function () {
        return emberGenerateDestroy(['model-test', 'foo'], (_file) => {
          expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/foo-default.js'));
        });
      });
    });
  });

  describe('octane', function () {
    enableOctane();

    beforeEach(async function () {
      await emberNew();
      modifyPackages([{ name: '@ember-data/model', dev: true }]);
    });

    it('model', function () {
      const args = ['model', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/foo.js'))
          .to.contain(`import Model from '@ember-data/model';`)
          .to.contain('export default class FooModel extends Model {');

        expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/rfc232.js'));
      });
    });

    it('model with attrs', function () {
      const args = [
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

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/foo.js'))
          .to.contain(`import Model, { attr } from '@ember-data/model';`)
          .to.contain('export default class FooModel extends Model {')
          .to.contain('  @attr misc;')
          .to.contain("  @attr('array') skills;")
          .to.contain("  @attr('boolean') isActive;")
          .to.contain("  @attr('date') birthday;")
          .to.contain("  @attr('object') someObject;")
          .to.contain("  @attr('number') age;")
          .to.contain("  @attr('string') name;")
          .to.contain("  @attr('custom-transform') customAttr;");

        expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/rfc232.js'));
      });
    });

    it('model with belongsTo', function () {
      const args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/comment.js'))
          .to.contain(`import Model, { belongsTo } from '@ember-data/model';`)
          .to.contain('export default class CommentModel extends Model {')
          .to.contain(`  @belongsTo('post', { async: false, inverse: null }) post;`)
          .to.contain("  @belongsTo('user', { async: false, inverse: null }) author;");

        expect(_file('tests/unit/models/comment-test.js')).to.equal(
          fixture(__dirname, 'model-test/comment-default.js')
        );
      });
    });

    it('model with hasMany', function () {
      const args = ['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/models/post.js'))
          .to.contain(`import Model, { hasMany } from '@ember-data/model';`)
          .to.contain('export default class PostModel extends Model {')
          .to.contain(`  @hasMany('comment', { async: false, inverse: null }) comments;`)
          .to.contain("  @hasMany('comment', { async: false, inverse: null }) otherComments;");

        expect(_file('tests/unit/models/post-test.js')).to.equal(fixture(__dirname, 'model-test/post-default.js'));
      });
    });

    it('model-test', function () {
      const args = ['model-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/rfc232.js'));
      });
    });

    describe('model-test with ember-cli-qunit@4.1.0', function () {
      beforeEach(function () {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('model-test-test foo', function () {
        return emberGenerateDestroy(['model-test', 'foo'], (_file) => {
          expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/foo-default.js'));
        });
      });
    });
  });

  describe('in addon', function () {
    beforeEach(async function () {
      await emberNew({ target: 'addon' });
      modifyPackages([{ name: '@ember-data/model', dev: true }]);
    });

    describe('with ember-qunit (default)', function () {
      it('model-test foo', function () {
        return emberGenerateDestroy(['model-test', 'foo'], (_file) => {
          expect(_file('tests/unit/models/foo-test.js')).to.equal(fixture(__dirname, 'model-test/rfc232-addon.js'));
        });
      });
    });
  });
});
