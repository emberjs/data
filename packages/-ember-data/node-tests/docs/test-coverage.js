/* eslint-disable no-console */
'use strict';

const path = require('path');

const QUnit = require('qunit');

const test = QUnit.test;

QUnit.module('Docs coverage', function(hooks) {
  let docs, expected;
  hooks.before(function() {
    if (!process.env.REUSE_DOCS) {
      buildDocs();
    }
    docs = require(path.join(__dirname, '../../dist/docs/data.json'));
    expected = require('../fixtures/expected');
  });

  QUnit.module('modules', function() {
    test('We have all expected modules', function(assert) {
      assert.deepEqual(Object.keys(docs.modules).sort(), expected.modules, 'We have all modules');
    });
  });

  QUnit.module('classitems', function(hooks) {
    let docsItems, expectedItems;
    hooks.before(function() {
      docsItems = new Set(
        docs.classitems
          .map(item => {
            // docs without internal and without a private flag are published as public by default
            let status =
              item.access || (Object.prototype.hasOwnProperty.call(item, 'internal') ? 'internal' : 'public');
            if (!item.name || status === 'internal') {
              return;
            }
            return `(${status}) ${item.module ? `${item.module} ` : ''}${item.class}#${item.name}`;
          })
          .filter(Boolean)
      );
      expectedItems = new Set(expected.classitems);
    });

    test('No missing classitems', function(assert) {
      let missing = setDifference(expectedItems, docsItems);
      assert.emptySet(
        missing,
        'If you intentionally removed a public API method, please udpate tests/docs/expected.js. Otherwise, documentation is missing, incorrectly formatted, or in a directory that is not watched by yuidoc. All files containing documentation must have a yuidoc class declaration.'
      );
    });

    test('No extraneous classitems', function(assert) {
      let extraneous = setDifference(docsItems, expectedItems);
      assert.emptySet(
        extraneous,
        'If you have added new features, please update tests/docs/expected.js and confirm that any public properties are marked both @public and @static to be included in the Ember API Docs viewer.'
      );
    });
  });
});

function buildDocs() {
  let child = require('child_process');
  child.execFileSync('node', [require.resolve('ember-cli/bin/ember'), 'ember-cli-yuidoc'], {
    stdio: 'pipe',
  });
}

function setDifference(setA, setB) {
  let difference = new Set(setA);
  for (var elem of setB) {
    difference.delete(elem);
  }
  return difference;
}

QUnit.assert.emptySet = function assertEmptySet(value, message) {
  this.pushResult({
    result: value.size === 0,
    actual: Array.from(value).sort(),
    expected: [],
    message: message,
  });
};
