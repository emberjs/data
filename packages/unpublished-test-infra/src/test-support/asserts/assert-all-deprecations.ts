import { DEBUG } from '@warp-drive/build-config/env';

import type { ExpandedHooks } from '.';
import { FoundDeprecation } from './assert-deprecation';

import { getOwnConfig } from '@embroider/macros';

const { ASSERT_ALL_DEPRECATIONS } = getOwnConfig<{ ASSERT_ALL_DEPRECATIONS?: boolean }>();

const ALL_ASSERTED_DEPRECATIONS: Record<string, number> = {};

function pushDeprecation(deprecation: string) {
  if (deprecation in ALL_ASSERTED_DEPRECATIONS) {
    ALL_ASSERTED_DEPRECATIONS[deprecation]++;
  } else {
    ALL_ASSERTED_DEPRECATIONS[deprecation] = 1;
  }
}

type Socket = { emit(type: string, name: string, data: unknown): void };

export function configureAssertAllDeprecations(hooks: ExpandedHooks) {
  if (DEBUG) {
    // @ts-expect-error Testem not typed
    if (window.Testem) {
      // @ts-expect-error Testem not typed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      window.Testem.useCustomAdapter(function (socket: Socket) {
        hooks.onSuiteFinish(function () {
          if (ASSERT_ALL_DEPRECATIONS && Object.keys(ALL_ASSERTED_DEPRECATIONS).length) {
            console.log('Deprecations: ', JSON.stringify(ALL_ASSERTED_DEPRECATIONS)); // eslint-disable-line no-console

            socket.emit('test-metadata', 'deprecations', ALL_ASSERTED_DEPRECATIONS);
          }
        });
      });
    }

    hooks.afterEach(async function assertAllDeprecations(assert) {
      if (typeof assert.test.expected === 'number') {
        assert.test.expected += 1;
      }

      await assert.expectNoDeprecation(
        undefined as unknown as () => void | Promise<void>,
        'Expected no deprecations during test',
        (deprecation: FoundDeprecation) => {
          // only assert EmberData deprecations
          const id = deprecation.options.id.toLowerCase();
          const isEmberDataDeprecation =
            id.includes('ds.') ||
            id.includes('emberdata') ||
            id.includes('ember-data') ||
            id.includes('mismatched-inverse-relationship-data-from-payload');

          if (!isEmberDataDeprecation) {
            if (ASSERT_ALL_DEPRECATIONS) {
              pushDeprecation(deprecation.options?.id ?? deprecation.message ?? 'unknown');
            } else {
              // eslint-disable-next-line no-console
              console.count(deprecation.options.id);
              // eslint-disable-next-line no-console
              console.warn('Detected Non-Ember-Data Deprecation:', deprecation.message, deprecation.options.stacktrace);
            }
          }

          return ASSERT_ALL_DEPRECATIONS ? true : isEmberDataDeprecation;
        }
      );
    });
  }
}
