'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('@ember-data/-build-infra/src/node-test-helpers/generate-fake-package-manifest');
const fixture = require('@ember-data/-build-infra/src/node-test-helpers/fixture');

const setupTestEnvironment = require('@ember-data/-build-infra/src/node-test-helpers/setup-test-environment');
const enableOctane = setupTestEnvironment.enableOctane;

describe('Acceptance: generate and destroy model blueprints', function() {
  setupTestHooks(this);

  describe('classic', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('model', function() {
      let args = ['model', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('app/models/foo.js'))
          .to.contain("import DS from 'ember-data';")
          .to.contain('const { Model } = DS;')
          .to.contain('export default Model.extend(');

        expect(_file('tests/unit/models/foo-test.js')).to.equal(
          fixture(__dirname, 'model-test/rfc232.js')
        );
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
          .to.contain('const { Model, attr } = DS;')
          .to.contain('export default Model.extend(')
          .to.contain('  misc: attr(),')
          .to.contain("  skills: attr('array'),")
          .to.contain("  isActive: attr('boolean'),")
          .to.contain("  birthday: attr('date'),")
          .to.contain("  someObject: attr('object'),")
          .to.contain("  age: attr('number'),")
          .to.contain("  name: attr('string'),")
          .to.contain("  customAttr: attr('custom-transform')");

        expect(_file('tests/unit/models/foo-test.js')).to.equal(
          fixture(__dirname, 'model-test/rfc232.js')
        );
      });
    });

    it('model with belongsTo', function() {
      let args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('app/models/comment.js'))
          .to.contain("import DS from 'ember-data';")
          .to.contain('const { Model, belongsTo } = DS;')
          .to.contain('export default Model.extend(')
          .to.contain("  post: belongsTo('post'),")
          .to.contain("  author: belongsTo('user')");

        expect(_file('tests/unit/models/comment-test.js')).to.equal(
          fixture(__dirname, 'model-test/comment-default.js')
        );
      });
    });

    it('model with hasMany', function() {
      let args = ['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('app/models/post.js'))
          .to.contain("import DS from 'ember-data';")
          .to.contain('const { Model, hasMany } = DS;')
          .to.contain('export default Model.extend(')
          .to.contain("  comments: hasMany('comment')")
          .to.contain("  otherComments: hasMany('comment')");

        expect(_file('tests/unit/models/post-test.js')).to.equal(
          fixture(__dirname, 'model-test/post-default.js')
        );
      });
    });

    it('model-test', function() {
      let args = ['model-test', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/models/foo-test.js')).to.equal(
          fixture(__dirname, 'model-test/rfc232.js')
        );
      });
    });

    describe('model-test with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('model-test-test foo', function() {
        return emberGenerateDestroy(['model-test', 'foo'], _file => {
          expect(_file('tests/unit/models/foo-test.js')).to.equal(
            fixture(__dirname, 'model-test/foo-default.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha v0.12+', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('model-test for mocha v0.12+', function() {
        let args = ['model-test', 'foo'];

        return emberGenerateDestroy(args, _file => {
          expect(_file('tests/unit/models/foo-test.js')).to.equal(
            fixture(__dirname, 'model-test/foo-mocha-0.12.js')
          );
        });
      });
    });

    describe('with ember-mocha v0.14+', function() {
      beforeEach(function() {
        modifyPackages([{ name: 'ember-qunit', delete: true }, { name: 'ember-mocha', dev: true }]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('model-test for mocha v0.14+', function() {
        let args = ['model-test', 'foo'];

        return emberGenerateDestroy(args, _file => {
          expect(_file('tests/unit/models/foo-test.js')).to.equal(
            fixture(__dirname, 'model-test/mocha-rfc232.js')
          );
        });
      });
    });
  });

  describe('module unification', function() {
    beforeEach(function() {
      return emberNew({ isModuleUnification: true });
    });

    it('model', function() {
      let args = ['model', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('const { Model } = DS;')
            .to.contain('export default Model.extend(');

          expect(_file('src/data/models/foo/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
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

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('const { Model, attr } = DS;')
            .to.contain('export default Model.extend(')
            .to.contain('  misc: attr(),')
            .to.contain("  skills: attr('array'),")
            .to.contain("  isActive: attr('boolean'),")
            .to.contain("  birthday: attr('date'),")
            .to.contain("  someObject: attr('object'),")
            .to.contain("  age: attr('number'),")
            .to.contain("  name: attr('string'),")
            .to.contain("  customAttr: attr('custom-transform')");

          expect(_file('src/data/models/foo/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('model with belongsTo', function() {
      let args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/comment/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('const { Model, belongsTo } = DS;')
            .to.contain('export default Model.extend(')
            .to.contain("  post: belongsTo('post'),")
            .to.contain("  author: belongsTo('user')");

          expect(_file('src/data/models/comment/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/comment-default.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('model with hasMany', function() {
      let args = ['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/post/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('const { Model, hasMany } = DS;')
            .to.contain('export default Model.extend(')
            .to.contain("  comments: hasMany('comment'),")
            .to.contain("  otherComments: hasMany('comment')");

          expect(_file('src/data/models/post/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/post-default.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('model-test', function() {
      let args = ['model-test', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    describe('model-test with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('model-test-test foo', function() {
        return emberGenerateDestroy(
          ['model-test', 'foo'],
          _file => {
            expect(_file('src/data/models/foo/model-test.js')).to.equal(
              fixture(__dirname, 'model-test/foo-default.js')
            );
          },
          { isModuleUnification: true }
        );
      });
    });

    describe('with ember-cli-mocha v0.12+', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('model-test for mocha v0.12+', function() {
        let args = ['model-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/model-test.js')).to.equal(
              fixture(__dirname, 'model-test/foo-mocha-0.12.js')
            );
          },
          { isModuleUnification: true }
        );
      });
    });

    describe('with ember-mocha v0.14+', function() {
      beforeEach(function() {
        modifyPackages([{ name: 'ember-qunit', delete: true }, { name: 'ember-mocha', dev: true }]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('model-test for mocha v0.14+', function() {
        let args = ['model-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/model-test.js')).to.equal(
              fixture(__dirname, 'model-test/mocha-rfc232.js')
            );
          },
          { isModuleUnification: true }
        );
      });
    });
  });

  describe('octane', function() {
    enableOctane();
    beforeEach(function() {
      return emberNew({ isModuleUnification: true });
    });

    it('model', function() {
      let args = ['model', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('export default class FooModel extends Model {');

          expect(_file('src/data/models/foo/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
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

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('const { Model, attr } = DS;')
            .to.contain('export default class FooModel extends Model {')
            .to.contain('  @attr() misc;')
            .to.contain("  @attr('array') skills;")
            .to.contain("  @attr('boolean') isActive;")
            .to.contain("  @attr('date') birthday;")
            .to.contain("  @attr('object') someObject;")
            .to.contain("  @attr('number') age;")
            .to.contain("  @attr('string') name;")
            .to.contain("  @attr('custom-transform') customAttr;");

          expect(_file('src/data/models/foo/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('model with belongsTo', function() {
      let args = ['model', 'comment', 'post:belongs-to', 'author:belongs-to:user'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/comment/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('const { Model, belongsTo } = DS;')
            .to.contain('export default class CommentModel extends Model {')
            .to.contain('  @belongsTo post;')
            .to.contain("  @belongsTo('user') author;");

          expect(_file('src/data/models/comment/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/comment-default.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('model with hasMany', function() {
      let args = ['model', 'post', 'comments:has-many', 'otherComments:has-many:comment'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/post/model.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('const { Model, hasMany } = DS;')
            .to.contain('export default class PostModel extends Model {')
            .to.contain('  @hasMany comments;')
            .to.contain("  @hasMany('comment') otherComments;");

          expect(_file('src/data/models/post/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/post-default.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('model-test', function() {
      let args = ['model-test', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/model-test.js')).to.equal(
            fixture(__dirname, 'model-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    describe('model-test with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('model-test-test foo', function() {
        return emberGenerateDestroy(
          ['model-test', 'foo'],
          _file => {
            expect(_file('src/data/models/foo/model-test.js')).to.equal(
              fixture(__dirname, 'model-test/foo-default.js')
            );
          },
          { isModuleUnification: true }
        );
      });
    });

    describe('with ember-cli-mocha v0.12+', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('model-test for mocha v0.12+', function() {
        let args = ['model-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/model-test.js')).to.equal(
              fixture(__dirname, 'model-test/foo-mocha-0.12.js')
            );
          },
          { isModuleUnification: true }
        );
      });
    });

    describe('with ember-mocha v0.14+', function() {
      beforeEach(function() {
        modifyPackages([{ name: 'ember-qunit', delete: true }, { name: 'ember-mocha', dev: true }]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('model-test for mocha v0.14+', function() {
        let args = ['model-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/model-test.js')).to.equal(
              fixture(__dirname, 'model-test/mocha-rfc232.js')
            );
          },
          { isModuleUnification: true }
        );
      });
    });
  });
});
