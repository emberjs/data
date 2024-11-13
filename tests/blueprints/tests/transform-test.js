'use strict';

const { describe, it, beforeEach, afterEach } = require('mocha');
const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const chai = require('ember-cli-blueprint-test-helpers/chai');

const path = require('path');
const file = require('ember-cli-blueprint-test-helpers/chai').file;

function fixture(directory, filePath) {
  return file(path.join(directory, '../fixtures', filePath));
}

const emberNew = blueprintHelpers.emberNew;
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

describe('Acceptance: generate and destroy transform blueprints', function () {
  setupTestHooks(this);

  describe('classic', function () {
    enableClassic({ beforeEach, afterEach });

    describe('in app', function () {
      beforeEach(async function () {
        await emberNew();
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
      });

      it('transform', function () {
        const args = ['transform', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('app/transforms/foo.js'))
            .to.contain('export default class FooTransform {')
            .to.contain('deserialize(serialized) {')
            .to.contain('serialize(deserialized) {');

          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/default.js'));
        });
      });

      it('transform-test', function () {
        const args = ['transform-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/default.js'));
        });
      });
    });
  });

  describe('octane', function () {
    describe('in app', function () {
      enableOctane({ beforeEach, afterEach });

      beforeEach(async function () {
        await emberNew();
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
      });

      it('transform', function () {
        const args = ['transform', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('app/transforms/foo.js'))
            .to.contain('export default class FooTransform {')
            .to.contain('deserialize(serialized) {')
            .to.contain('serialize(deserialized) {');

          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/default.js'));
        });
      });

      it('transform-test', function () {
        const args = ['transform-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/default.js'));
        });
      });
    });
  });

  describe('in addon', function () {
    beforeEach(async function () {
      await emberNew({ target: 'addon' });
      await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
    });

    describe('with ember-qunit (default)', function () {
      it('transform-test foo', function () {
        return emberGenerateDestroy(['transform-test', 'foo'], (_file) => {
          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
            fixture(__dirname, 'transform-test/addon-default.js')
          );
        });
      });
    });
  });
});
