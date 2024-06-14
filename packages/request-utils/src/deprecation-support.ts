import { deprecate } from '@ember/debug';

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

import { DEPRECATE_EMBER_INFLECTOR } from '@warp-drive/build-config/deprecations';

import { irregular, plural, singular, uncountable } from './string';

if (DEPRECATE_EMBER_INFLECTOR) {
  if (macroCondition(dependencySatisfies('ember-inflector', '*'))) {
    const Inflector = (importSync('ember-inflector') as { default: typeof import('ember-inflector').default }).default;
    const { inflector } = Inflector;

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalPlural = inflector.plural;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalSingular = inflector.singular;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalIrregular = inflector.irregular;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalUncountable = inflector.uncountable;

    inflector.plural = function (...args: Parameters<typeof originalPlural>) {
      plural(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for pluralization.\nPlease \`import { plural } from '@warp-drive/request-utils';\` instead to register a custom pluralization rule for use with EmberData.`,
        false,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '5.3.4',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalPlural.apply(inflector, args);
    };

    inflector.singular = function (...args: Parameters<typeof originalSingular>) {
      singular(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for singularization.\nPlease \`import { singular } from '@warp-drive/request-utils';\` instead to register a custom singularization rule for use with EmberData.`,
        false,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '5.3.4',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalSingular.apply(inflector, args);
    };

    inflector.irregular = function (...args: Parameters<typeof originalIrregular>) {
      irregular(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for irregular rules.\nPlease \`import { irregular } from '@warp-drive/request-utils';\` instead to register a custom irregular rule for use with EmberData.`,
        false,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '5.3.4',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalIrregular.apply(inflector, args);
    };

    inflector.uncountable = function (...args: Parameters<typeof originalUncountable>) {
      uncountable(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for uncountable rules.\nPlease \`import { uncountable } from '@warp-drive/request-utils';\` instead to register a custom uncountable rule for use with EmberData.`,
        false,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '5.3.4',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalUncountable.apply(inflector, args);
    };
  }
}
