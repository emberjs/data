'use strict';
const QUnit = require('qunit');

const { test } = QUnit;

function isNonEmptyString(str) {
  return typeof str === 'string' && str.length > 0;
}
function isOwnModule(item) {
  if (item.module) {
    return ['ember-inflector'].indexOf(item.module) === -1;
  }
  if (item.class) {
    return ['Ember.Inflector', 'Ember.HTMLBars.helpers'].indexOf(item.class) === -1;
  }
  return item.file.indexOf('node_modules') === -1;
}

function linkItem(item) {
  return `${item.file} line ${item.line}`;
}

QUnit.module('Docs coverage', function (hooks) {
  // data.json is generated and not always present. So this disable needs to be preserved.
  const docs = require('../../packages/-ember-data/dist/docs/data.json'); // eslint-disable-line node/no-missing-require
  const expected = require('./fixtures/expected');

  function classIsPublic(className) {
    return docs.classes[className].access !== 'private';
  }

  QUnit.module('modules', function () {
    test('We have all expected modules', function (assert) {
      assert.deepEqual(Object.keys(docs.modules).sort(), expected.modules, 'We have all modules');
    });

    Object.keys(docs.modules).forEach((moduleName) => {
      const module = docs.modules[moduleName];
      if (isOwnModule(module)) {
        test(`${moduleName} is configured correctly`, function (assert) {
          assert.strictEqual(module.tag, 'main', `${moduleName} is tagged as main in ${linkItem(module)}`);
          assert.true(isNonEmptyString(module.description), `${moduleName} has a description in ${linkItem(module)}`);
          assert.false(
            Object.hasOwnProperty.call(module, 'extends'),
            `${moduleName} does not extend: ${module.extends} in ${linkItem(module)}`
          );
        });
      }
    });
  });

  QUnit.module('classes', function (hooks) {
    Object.keys(docs.classes).forEach((className) => {
      const def = docs.classes[className];
      if (className === def.module) {
        return;
      }
      test(`Class ${className} is documented correctly at ${linkItem(def)}`, function (assert) {
        assert.true(
          def.access === 'public' || def.access === 'private',
          `${def.name} must declare either as either @internal @private or @public`
        );
        if (def.access !== 'private') {
          assert.true(isNonEmptyString(def.description), `${className} must provide a description.`);
          assert.true(isNonEmptyString(def.module), `${className} must be assigned a module.`);
        }
      });
    });
  });

  QUnit.module('classitems', function (hooks) {
    let docsItems, expectedItems;
    hooks.before(function () {
      docsItems = new Set(
        docs.classitems
          .map((item) => {
            if (!item.name || !isOwnModule(item)) {
              return;
            }
            // docs without a private flag are published as public by default
            // We error for these
            let status = item.access || 'public';
            return `(${status}) ${item.module ? `${item.module} ` : ''}${item.class}#${item.name}`;
          })
          .filter(Boolean)
      );
      expectedItems = new Set(expected.classitems);
    });

    test('No unnecessary module declarations', function (assert) {
      docs.classitems.forEach((item) => {
        if (isOwnModule(item)) {
          const hasName = isNonEmptyString(item.name);
          if (!hasName && (item.access || item.itemtype || item.params)) {
            assert.true(
              false,
              `The documentation for the property, method, class, or module at ${linkItem(item)} is missing a name.`
            );
          } else if (!hasName && isNonEmptyString(item.description)) {
            assert.true(
              false,
              `The documentation code block at ${linkItem(
                item
              )} should use only a single star to avoid being parsed by yuidoc.`
            );
          } else {
            assert.true(hasName, `The empty documentation comment at ${linkItem(item)} should be removed.`);
          }
        }
      });
    });

    docs.classitems.forEach((item) => {
      const hasName = isNonEmptyString(item.name);
      if (isOwnModule(item) && hasName) {
        test(`${item.module} ${item.class ? item.class : item.for} ${
          item.name
        } has a complete definition`, function (assert) {
          assert.true(
            item.access === 'public' || item.access === 'private',
            `${item.name} must declare either as either @internal @private or @public in ${linkItem(item)}`
          );
          assert.true(
            item.access === 'private' || (item.class && classIsPublic(item.class)),
            `Cannot declare a public member of a private class.`
          );
          if (item.access === 'public') {
            assert.true(
              isNonEmptyString(item.description),
              `public ${item.itemtype} ${item.name} must have a description`
            );
          }
        });
      }
    });

    test('No missing classitems', function (assert) {
      let missing = setDifference(expectedItems, docsItems);
      assert.emptySet(
        missing,
        'If you intentionally removed a public API method, please udpate tests/docs/expected.js. Otherwise, documentation is missing, incorrectly formatted, or in a directory that is not watched by yuidoc. All files containing documentation must have a yuidoc class declaration.'
      );
    });

    test('No extraneous classitems', function (assert) {
      let extraneous = setDifference(docsItems, expectedItems);
      assert.emptySet(
        extraneous,
        'If you have added new features, please update tests/docs/expected.js and confirm that any public properties are marked both @public and @static to be included in the Ember API Docs viewer.'
      );
    });
  });
});

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
