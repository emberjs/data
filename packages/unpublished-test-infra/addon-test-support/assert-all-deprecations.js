/* eslint-disable no-console */
import { DEBUG } from '@glimmer/env';
import QUnit from 'qunit';
import config from 'dummy/config/environment';

const { ASSERT_ALL_DEPRECATIONS } = config;

const ALL_ASSERTED_DEPRECATIONS = [];

export default function configureAssertAllDeprecations() {
  QUnit.begin(() => {
    function assertAllDeprecations(assert) {
      if (typeof assert.test.expected === 'number') {
        assert.test.expected += 1;
      }
      assert.expectNoDeprecation(undefined, undefined, deprecation => {
        // only assert EmberData deprecations
        const id = deprecation.options.id.toLowerCase();
        const isEmberDataDeprecation =
          id.includes('ds.') ||
          id.includes('emberdata') ||
          id.includes('ember-data') ||
          id.includes('mismatched-inverse-relationship-data-from-payload');

        if (!ASSERT_ALL_DEPRECATIONS && !isEmberDataDeprecation) {
          console.warn('Detected Non-Ember-Data Deprecation:', deprecation.message, deprecation.options.stacktrace);
        }
        if (ASSERT_ALL_DEPRECATIONS) {
          ALL_ASSERTED_DEPRECATIONS.push((deprecation.options && deprecation.options.id) || deprecation);
        }

        return ASSERT_ALL_DEPRECATIONS ? true : isEmberDataDeprecation;
      });
    }
    // ensure we don't regress quietly
    // this plays nicely with `expectDeprecation`
    if (DEBUG) {
      QUnit.config.modules.forEach(mod => {
        const hooks = (mod.hooks.afterEach = mod.hooks.afterEach || []);

        if (mod.tests.length !== 0) {
          hooks.unshift(assertAllDeprecations);
        }
      });
    }
  });

  QUnit.done(function() {
    if (ASSERT_ALL_DEPRECATIONS) {
      let deprecations = {};
      for (let deprecation of ALL_ASSERTED_DEPRECATIONS) {
        if (deprecation in deprecations) {
          deprecations[deprecation]++;
        } else {
          deprecations[deprecation] = 1;
        }
      }

      QUnit.config.deprecations = deprecations;
    }
  });
}
