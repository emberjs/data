import { deprecate } from '@ember/debug';

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

import { DEPRECATE_EMBER_INFLECTOR, DISABLE_6X_DEPRECATIONS } from '@warp-drive/build-config/deprecations';

import { defaultRules as WarpDriveDefaults } from './-private/string/inflections';
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

    // copy over any already registered rules
    type DefaultRules = {
      plurals: [RegExp, string][];
      singular: [RegExp, string][];
      irregularPairs: [string, string][];
      uncountable: string[];
    };
    type InternalRules = {
      plurals: [RegExp, string][];
      singular: [RegExp, string][];

      // [str1, str2] =>
      // { [str1.lower]: str2 }
      // { [str2.lower]: str2 }
      irregular: Record<string, string>;

      // [str1, str2] =>
      // { [str2.lower]: str1 }
      // { [str1.lower]: str1 }
      irregularInverse: Record<string, string>;

      // lower cased string
      uncountable: Record<string, boolean>;
    };

    // ember-inflector mutates the default rules arrays
    // with user supplied rules, so we keep track of what
    // is default via our own list.
    const defaultPluralKeys = new Set<string>();
    const defaultSingularKeys = new Set<string>();
    WarpDriveDefaults.plurals.forEach(([regex]) => {
      defaultPluralKeys.add(regex.toString());
    });
    WarpDriveDefaults.singular.forEach(([regex]) => {
      defaultSingularKeys.add(regex.toString());
    });

    const { defaultRules } = Inflector as unknown as { defaultRules: DefaultRules };
    const { rules } = inflector as unknown as { rules: InternalRules };

    const irregularMap = new Map<string, string>();
    const toIgnore = new Set<string>();
    const uncountableSet = new Set(defaultRules.uncountable);

    defaultRules.irregularPairs.forEach(([single, plur]) => {
      irregularMap.set(single.toLowerCase(), plur);
      toIgnore.add(plur.toLowerCase());
    });
    const irregularLookups = new Map<string, string>();
    Object.keys(rules.irregular).forEach((single) => {
      const plur = rules.irregular[single];
      irregularLookups.set(single, plur);
    });

    // load plurals
    rules.plurals.forEach(([regex, replacement]) => {
      if (defaultPluralKeys.has(regex.toString())) {
        return;
      }

      plural(regex, replacement);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for pluralization.\nPlease \`import { plural } from '@ember-data/request-utils/string';\` instead to register a custom pluralization rule for use with EmberData.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );
    });

    // load singulars
    rules.singular.forEach(([regex, replacement]) => {
      if (defaultSingularKeys.has(regex.toString())) {
        return;
      }

      singular(regex, replacement);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for singularization.\nPlease \`import { singular } from '@ember-data/request-utils/string';\` instead to register a custom singularization rule for use with EmberData.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );
    });

    // load irregulars
    Object.keys(rules.irregular).forEach((single) => {
      const plur = rules.irregular[single];
      const defaultPlur = irregularMap.get(single);
      if (defaultPlur && defaultPlur === plur) {
        return;
      }

      if (toIgnore.has(single)) {
        return;
      }

      const actualSingle = irregularLookups.get(plur.toLowerCase()) || single;
      toIgnore.add(plur.toLowerCase());
      irregular(actualSingle, plur);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for irregular rules.\nPlease \`import { irregular } from '@ember-data/request-utils/string';\` instead to register a custom irregular rule for use with EmberData for '${actualSingle}' <=> '${plur}'.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );
    });

    // load uncountables
    Object.keys(rules.uncountable).forEach((word) => {
      if (uncountableSet.has(word) || rules.uncountable[word] !== true) {
        return;
      }

      uncountable(word);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for uncountable rules.\nPlease \`import { uncountable } from '@ember-data/request-utils/string';\` instead to register a custom uncountable rule for '${word}' for use with EmberData.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );
    });

    inflector.plural = function (...args: Parameters<typeof originalPlural>) {
      plural(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for pluralization.\nPlease \`import { plural } from '@ember-data/request-utils/string';\` instead to register a custom pluralization rule for use with EmberData.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalPlural.apply(inflector, args);
    };

    inflector.singular = function (...args: Parameters<typeof originalSingular>) {
      singular(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for singularization.\nPlease \`import { singular } from '@ember-data/request-utils/string';\` instead to register a custom singularization rule for use with EmberData.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalSingular.apply(inflector, args);
    };

    inflector.irregular = function (...args: Parameters<typeof originalIrregular>) {
      irregular(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for irregular rules.\nPlease \`import { irregular } from '@ember-data/request-utils/string';\` instead to register a custom irregular rule for use with EmberData.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalIrregular.apply(inflector, args);
    };

    inflector.uncountable = function (...args: Parameters<typeof originalUncountable>) {
      uncountable(...args);

      deprecate(
        `WarpDrive/EmberData no longer uses ember-inflector for uncountable rules.\nPlease \`import { uncountable } from '@ember-data/request-utils/string';\` instead to register a custom uncountable rule for use with EmberData.`,
        /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
        {
          id: 'warp-drive.ember-inflector',
          until: '6.0.0',
          for: 'warp-drive',
          since: {
            enabled: '5.3.4',
            available: '4.13',
          },
          url: 'https://deprecations.emberjs.com/id/warp-drive.ember-inflector',
        }
      );

      return originalUncountable.apply(inflector, args);
    };
  }
}
