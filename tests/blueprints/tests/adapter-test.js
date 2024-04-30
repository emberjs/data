'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const chai = require('ember-cli-blueprint-test-helpers/chai');
const SilentError = require('silent-error');

const path = require('path');
const file = require('ember-cli-blueprint-test-helpers/chai').file;

function fixture(directory, filePath) {
  return file(path.join(directory, '../fixtures', filePath));
}

const fs = require('fs');

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

const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const expect = chai.expect;

describe('Acceptance: generate and destroy adapter blueprints', function () {
  setupTestHooks(this);

  describe('classic', function () {
    enableClassic();

    beforeEach(async function () {
      await emberNew();
      modifyPackages([{ name: '@ember-data/adapter', dev: true }]);
    });

    it('adapter', async function () {
      const args = ['adapter', 'foo'];

      await emberGenerateDestroy(args, (_file) => {
        expect(_file('app/adapters/foo.js'))
          .to.contain(`import JSONAPIAdapter from '@ember-data/adapter/json-api';`)
          .to.contain('export default JSONAPIAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
      });
    });

    it('adapter extends application adapter if it exists', async function () {
      const args = ['adapter', 'foo'];

      await emberGenerate(['adapter', 'application']);
      await emberGenerateDestroy(args, (_file) => {
        expect(_file('app/adapters/foo.js'))
          .to.contain("import ApplicationAdapter from './application';")
          .to.contain('export default ApplicationAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
      });
    });

    it('adapter with --base-class', async function () {
      const args = ['adapter', 'foo', '--base-class=bar'];

      await emberGenerateDestroy(args, (_file) => {
        expect(_file('app/adapters/foo.js'))
          .to.contain("import BarAdapter from './bar';")
          .to.contain('export default BarAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
      });
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    xit('adapter throws when --base-class is same as name', function () {
      const args = ['adapter', 'foo', '--base-class=foo'];

      return expect(emberGenerate(args)).to.be.rejectedWith(SilentError, /Adapters cannot extend from themself/);
    });

    it('adapter when is named "application"', function () {
      const args = ['adapter', 'application'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/adapters/application.js'))
          .to.contain(`import JSONAPIAdapter from '@ember-data/adapter/json-api';`)
          .to.contain('export default JSONAPIAdapter.extend({');

        expect(_file('tests/unit/adapters/application-test.js')).to.equal(
          fixture(__dirname, 'adapter-test/application-default.js')
        );
      });
    });

    it('adapter-test', function () {
      const args = ['adapter-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
      });
    });

    describe('adapter-test with ember-cli-qunit@4.1.0', function () {
      beforeEach(function () {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('adapter-test-test foo', function () {
        return emberGenerateDestroy(['adapter-test', 'foo'], (_file) => {
          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/foo-default.js'));
        });
      });
    });
  });

  describe('octane', function () {
    enableOctane();

    beforeEach(async function () {
      await emberNew();
      modifyPackages([{ name: '@ember-data/adapter', dev: true }]);
    });

    it('adapter', function () {
      const args = ['adapter', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/adapters/foo.js'))
          .to.contain(`import JSONAPIAdapter from '@ember-data/adapter/json-api';`)
          .to.contain('export default class FooAdapter extends JSONAPIAdapter {');

        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
      });
    });

    it('adapter extends application adapter if it exists', function () {
      const args = ['adapter', 'foo'];

      return emberGenerate(['adapter', 'application']).then(() =>
        emberGenerateDestroy(args, (_file) => {
          expect(_file('app/adapters/foo.js'))
            .to.contain("import ApplicationAdapter from './application';")
            .to.contain('export default class FooAdapter extends ApplicationAdapter {');

          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
        })
      );
    });

    it('adapter with --base-class', function () {
      const args = ['adapter', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/adapters/foo.js'))
          .to.contain("import BarAdapter from './bar';")
          .to.contain('export default class FooAdapter extends BarAdapter {');

        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
      });
    });

    it('adapter when is named "application"', function () {
      const args = ['adapter', 'application'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/adapters/application.js'))
          .to.contain(`import JSONAPIAdapter from '@ember-data/adapter/json-api';`)
          .to.contain('export default class ApplicationAdapter extends JSONAPIAdapter {');

        expect(_file('tests/unit/adapters/application-test.js')).to.equal(
          fixture(__dirname, 'adapter-test/application-default.js')
        );
      });
    });

    it('adapter-test', function () {
      const args = ['adapter-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232.js'));
      });
    });

    describe('adapter-test with ember-cli-qunit@4.1.0', function () {
      beforeEach(function () {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('adapter-test-test foo', function () {
        return emberGenerateDestroy(['adapter-test', 'foo'], (_file) => {
          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/foo-default.js'));
        });
      });
    });
  });

  describe('in addon', function () {
    beforeEach(async function () {
      await emberNew({ target: 'addon' });
      modifyPackages([{ name: '@ember-data/adapter', dev: true }]);
    });

    describe('with ember-qunit (default)', function () {
      it('adapter-test foo', function () {
        return emberGenerateDestroy(['adapter-test', 'foo'], (_file) => {
          expect(_file('tests/unit/adapters/foo-test.js')).to.equal(fixture(__dirname, 'adapter-test/rfc232-addon.js'));
        });
      });
    });
  });
});
