'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const SilentError = require('silent-error');

const generateFakePackageManifest = require('@ember-data/-build-infra/src/node-test-helpers/generate-fake-package-manifest');
const fixture = require('@ember-data/-build-infra/src/node-test-helpers/fixture');

const setupTestEnvironment = require('@ember-data/-build-infra/src/node-test-helpers/setup-test-environment');
const enableOctane = setupTestEnvironment.enableOctane;

describe('Acceptance: generate and destroy adapter blueprints', function() {
  setupTestHooks(this);

  describe('classic', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('adapter', function() {
      let args = ['adapter', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('app/adapters/foo.js'))
          .to.contain("import DS from 'ember-data';")
          .to.contain('export default DS.JSONAPIAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(
          fixture(__dirname, 'adapter-test/rfc232.js')
        );
      });
    });

    it('adapter extends application adapter if it exists', function() {
      let args = ['adapter', 'foo'];

      return emberGenerate(['adapter', 'application']).then(() =>
        emberGenerateDestroy(args, _file => {
          expect(_file('app/adapters/foo.js'))
            .to.contain("import ApplicationAdapter from './application';")
            .to.contain('export default ApplicationAdapter.extend({');

          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/rfc232.js')
          );
        })
      );
    });

    it('adapter with --base-class', function() {
      let args = ['adapter', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('app/adapters/foo.js'))
          .to.contain("import BarAdapter from './bar';")
          .to.contain('export default BarAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(
          fixture(__dirname, 'adapter-test/rfc232.js')
        );
      });
    });

    xit('adapter throws when --base-class is same as name', function() {
      let args = ['adapter', 'foo', '--base-class=foo'];

      return expect(emberGenerate(args)).to.be.rejectedWith(
        SilentError,
        /Adapters cannot extend from themself/
      );
    });

    it('adapter when is named "application"', function() {
      let args = ['adapter', 'application'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('app/adapters/application.js'))
          .to.contain("import DS from 'ember-data';")
          .to.contain('export default DS.JSONAPIAdapter.extend({');

        expect(_file('tests/unit/adapters/application-test.js')).to.equal(
          fixture(__dirname, 'adapter-test/application-default.js')
        );
      });
    });

    it('adapter-test', function() {
      let args = ['adapter-test', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(
          fixture(__dirname, 'adapter-test/rfc232.js')
        );
      });
    });

    describe('adapter-test with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('adapter-test-test foo', function() {
        return emberGenerateDestroy(['adapter-test', 'foo'], _file => {
          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/foo-default.js')
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

      it('adapter-test for mocha v0.12+', function() {
        let args = ['adapter-test', 'foo'];

        return emberGenerateDestroy(args, _file => {
          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/foo-mocha-0.12.js')
          );
        });
      });
    });

    describe('with ember-mocha v0.14+', function() {
      beforeEach(function() {
        modifyPackages([{ name: 'ember-qunit', delete: true }, { name: 'ember-mocha', dev: true }]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('adapter-test for mocha v0.14+', function() {
        return emberGenerateDestroy(['adapter-test', 'foo'], _file => {
          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/mocha-rfc232.js')
          );
        });
      });
    });
  });

  describe('module unification', function() {
    beforeEach(function() {
      return emberNew({ isModuleUnification: true });
    });

    it('adapter', function() {
      let args = ['adapter', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/adapter.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('export default DS.JSONAPIAdapter.extend({');

          expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('adapter extends application adapter if it exists', function() {
      let args = ['adapter', 'foo'];

      return emberGenerate(['adapter', 'application'], { isModuleUnification: true }).then(() =>
        emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/adapter.js'))
              .to.contain("import ApplicationAdapter from '../application/adapter';")
              .to.contain('export default ApplicationAdapter.extend({');

            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/rfc232.js')
            );
          },
          { isModuleUnification: true }
        )
      );
    });

    it('adapter with --base-class', function() {
      let args = ['adapter', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/adapter.js'))
            .to.contain("import BarAdapter from '../bar/adapter';")
            .to.contain('export default BarAdapter.extend({');

          expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('adapter when is named "application"', function() {
      let args = ['adapter', 'application'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/application/adapter.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('export default DS.JSONAPIAdapter.extend({');

          expect(_file('src/data/models/application/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/application-default.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('adapter-test', function() {
      let args = ['adapter-test', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    describe('adapter-test with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('adapter-test-test foo', function() {
        return emberGenerateDestroy(
          ['adapter-test', 'foo'],
          _file => {
            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/foo-default.js')
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

      it('adapter-test for mocha v0.12+', function() {
        let args = ['adapter-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/foo-mocha-0.12.js')
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

      it('adapter-test for mocha v0.14+', function() {
        let args = ['adapter-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/mocha-rfc232.js')
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

    it('adapter', function() {
      let args = ['adapter', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/adapter.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('export default class FooAdapter extends DS.JSONAPIAdapter {');

          expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('adapter extends application adapter if it exists', function() {
      let args = ['adapter', 'foo'];

      return emberGenerate(['adapter', 'application'], { isModuleUnification: true }).then(() =>
        emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/adapter.js'))
              .to.contain("import ApplicationAdapter from '../application/adapter';")
              .to.contain('export default class FooAdapter extends ApplicationAdapter {');

            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/rfc232.js')
            );
          },
          { isModuleUnification: true }
        )
      );
    });

    it('adapter with --base-class', function() {
      let args = ['adapter', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/adapter.js'))
            .to.contain("import BarAdapter from '../bar/adapter';")
            .to.contain('export default class FooAdapter extends BarAdapter {');

          expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('adapter when is named "application"', function() {
      let args = ['adapter', 'application'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/application/adapter.js'))
            .to.contain("import DS from 'ember-data';")
            .to.contain('export default class ApplicationAdapter extends DS.JSONAPIAdapter {');

          expect(_file('src/data/models/application/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/application-default.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('adapter-test', function() {
      let args = ['adapter-test', 'foo'];

      return emberGenerateDestroy(
        args,
        _file => {
          expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
            fixture(__dirname, 'adapter-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    describe('adapter-test with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('adapter-test-test foo', function() {
        return emberGenerateDestroy(
          ['adapter-test', 'foo'],
          _file => {
            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/foo-default.js')
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

      it('adapter-test for mocha v0.12+', function() {
        let args = ['adapter-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/foo-mocha-0.12.js')
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

      it('adapter-test for mocha v0.14+', function() {
        let args = ['adapter-test', 'foo'];

        return emberGenerateDestroy(
          args,
          _file => {
            expect(_file('src/data/models/foo/adapter-test.js')).to.equal(
              fixture(__dirname, 'adapter-test/mocha-rfc232.js')
            );
          },
          { isModuleUnification: true }
        );
      });
    });
  });
});
