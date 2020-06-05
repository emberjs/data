import { deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import Store from '@ember-data/store';

function initializeStore(application) {
  // we can just use registerOptionsForType when we no longer
  // support (deprecated) versions of @ember/test-helpers
  // We're issuing a "private-api" deprecation for users of the
  // deprecated @ember/test-helpers versions, but will keep
  // this for as long as until 4.0 as needed
  if (DEBUG && !application.registerOptionsForType) {
    deprecate(
      `Deprecated test syntax usage detected!\n\n\t` +
        `This test relies on a deprecated test setup that is no longer supported by EmberData.` +
        ` To resolve this you will need to be on a recent version of @ember/test-helpers` +
        ` AND your tests must use \`setApplication()\` instead of \`setResolver()\` and` +
        ` \`module()\` with \`setup*Test()\`instead of \`moduleFor*()\`.`,
      false,
      {
        id: 'ember-data:legacy-test-helper-support',
        until: '3.17',
      }
    );

    application.optionsForType('serializer', { singleton: false });
    application.optionsForType('adapter', { singleton: false });

    if (!application.has('service:store')) {
      application.register('service:store', Store);
    }

    return;
  }

  application.registerOptionsForType('serializer', { singleton: false });
  application.registerOptionsForType('adapter', { singleton: false });

  if (!application.hasRegistration('service:store')) {
    application.register('service:store', Store);
  }
}

function initializeStoreInjections(application) {
  let inject = application.inject || application.injection;
  inject.call(application, 'controller', 'store', 'service:store');
  inject.call(application, 'route', 'store', 'service:store');
}

export default function setupContainer(application) {
  initializeStoreInjections(application);
  initializeStore(application);
}
