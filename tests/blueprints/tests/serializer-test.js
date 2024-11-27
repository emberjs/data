'use strict';

const { describe, it, beforeEach, afterEach } = require('mocha');
const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const chai = require('ember-cli-blueprint-test-helpers/chai');
const SilentError = require('silent-error');

const path = require('path');
const file = require('ember-cli-blueprint-test-helpers/chai').file;

function fixture(directory, filePath) {
  return file(path.join(directory, '../fixtures', filePath));
}

const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const expect = chai.expect;
const { setEdition, clearEdition } = require('@ember/edition-utils');

function enableOctane(hooks) {
  hooks.beforeEach(function () {
    setEdition('octane');
  });

  hooks.afterEach(function () {
    clearEdition();
  });
}

function enableClassic(hooks) {
  hooks.beforeEach(function () {
    setEdition('classic');
  });

  hooks.afterEach(function () {
    clearEdition();
  });
}

function setupTestHooks(context) {
  // context.timeout = function () {};
  blueprintHelpers.setupTestHooks(context);
}

describe('Acceptance: generate and destroy serializer blueprints', function () {
  setupTestHooks(this);

  describe('classic', function () {
    enableClassic({ beforeEach, afterEach });

    beforeEach(async function () {
      await emberNew();
      await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
    });

    it('serializer', function () {
      const args = ['serializer', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default JSONAPISerializer.extend(');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/foo-default.js')
        );
      });
    });

    it('serializer extends application serializer if it exists', function () {
      const args = ['serializer', 'foo'];

      return emberGenerate(['serializer', 'application']).then(() =>
        emberGenerateDestroy(args, (_file) => {
          expect(_file('app/serializers/foo.js'))
            .to.contain("import ApplicationSerializer from './application';")
            .to.contain('export default ApplicationSerializer.extend({');

          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/foo-default.js')
          );
        })
      );
    });

    it('serializer with --base-class', function () {
      const args = ['serializer', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain("import BarSerializer from './bar';")
          .to.contain('export default BarSerializer.extend({');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/foo-default.js')
        );
      });
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    xit('serializer throws when --base-class is same as name', function () {
      const args = ['serializer', 'foo', '--base-class=foo'];

      return expect(emberGenerate(args)).to.be.rejectedWith(SilentError, /Serializers cannot extend from themself/);
    });

    it('serializer when is named "application"', function () {
      const args = ['serializer', 'application'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/application.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default JSONAPISerializer.extend({');

        expect(_file('tests/unit/serializers/application-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/application-default.js')
        );
      });
    });

    it('serializer-test', function () {
      const args = ['serializer-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/foo-default.js')
        );
      });
    });
  });

  describe('octane', function () {
    enableOctane({ beforeEach, afterEach });

    beforeEach(async function () {
      await emberNew();
      await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
    });

    it('serializer', function () {
      const args = ['serializer', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default class FooSerializer extends JSONAPISerializer {');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/foo-default.js')
        );
      });
    });

    it('serializer extends application serializer if it exists', function () {
      const args = ['serializer', 'foo'];

      return emberGenerate(['serializer', 'application']).then(() =>
        emberGenerateDestroy(args, (_file) => {
          expect(_file('app/serializers/foo.js'))
            .to.contain("import ApplicationSerializer from './application';")
            .to.contain('export default class FooSerializer extends ApplicationSerializer {');

          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/foo-default.js')
          );
        })
      );
    });

    it('serializer with --base-class', function () {
      const args = ['serializer', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain("import BarSerializer from './bar';")
          .to.contain('export default class FooSerializer extends BarSerializer');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/foo-default.js')
        );
      });
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    xit('serializer throws when --base-class is same as name', function () {
      const args = ['serializer', 'foo', '--base-class=foo'];

      return expect(emberGenerate(args)).to.be.rejectedWith(SilentError, /Serializers cannot extend from themself/);
    });

    it('serializer when is named "application"', function () {
      const args = ['serializer', 'application'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/application.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default class ApplicationSerializer extends JSONAPISerializer {');

        expect(_file('tests/unit/serializers/application-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/application-default.js')
        );
      });
    });

    it('serializer-test', function () {
      const args = ['serializer-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/foo-default.js')
        );
      });
    });
  });

  describe('in addon', function () {
    beforeEach(async function () {
      await emberNew({ target: 'addon' });
      await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
    });

    describe('with ember-qunit (default)', function () {
      it('serializer-test foo', function () {
        return emberGenerateDestroy(['serializer-test', 'foo'], (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/addon-default.js')
          );
        });
      });
    });
  });
});
