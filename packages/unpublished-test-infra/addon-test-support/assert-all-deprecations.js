/* eslint no-console:"off" */
import { DEBUG } from '@glimmer/env';

import QUnit from 'qunit';

import config from 'ember-get-config';

const { ASSERT_ALL_DEPRECATIONS } = config;

const ALL_ASSERTED_DEPRECATIONS = {};

function pushDeprecation(deprecation) {
  if (deprecation in ALL_ASSERTED_DEPRECATIONS) {
    ALL_ASSERTED_DEPRECATIONS[deprecation]++;
  } else {
    ALL_ASSERTED_DEPRECATIONS[deprecation] = 1;
  }
}

export default function configureAssertAllDeprecations() {
  QUnit.begin(() => {
    function assertAllDeprecations(assert) {
      if (typeof assert.test.expected === 'number') {
        assert.test.expected += 1;
      }
      assert.expectNoDeprecation(undefined, undefined, (deprecation) => {
        // only assert EmberData deprecations
        const id = deprecation.options.id.toLowerCase();
        const isEmberDataDeprecation =
          id.includes('ds.') ||
          id.includes('emberdata') ||
          id.includes('ember-data') ||
          id.includes('mismatched-inverse-relationship-data-from-payload');

        if (!isEmberDataDeprecation) {
          if (ASSERT_ALL_DEPRECATIONS) {
            pushDeprecation((deprecation.options && deprecation.options.id) || deprecation);
          } else {
            console.count(deprecation.options.id);
            console.warn('Detected Non-Ember-Data Deprecation:', deprecation.message, deprecation.options.stacktrace);
          }
        }

        return ASSERT_ALL_DEPRECATIONS ? true : isEmberDataDeprecation;
      });
    }
    // ensure we don't regress quietly
    // this plays nicely with `expectDeprecation`
    if (DEBUG) {
      QUnit.config.modules.forEach((mod) => {
        const hooks = (mod.hooks.afterEach = mod.hooks.afterEach || []);

        if (mod.tests.length !== 0) {
          hooks.unshift(assertAllDeprecations);
        }
      });
    }
  });

  QUnit.done(function () {
    if (ASSERT_ALL_DEPRECATIONS) {
      QUnit.config.deprecations = ALL_ASSERTED_DEPRECATIONS;
    }
  });
}
