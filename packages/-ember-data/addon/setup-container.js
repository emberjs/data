import { getOwner } from '@ember/application';
import { deprecate } from '@ember/debug';
import Route from '@ember/routing/route';
import { DEBUG } from '@glimmer/env';

const EMBER_DATA_STORE = Symbol('ember-data-store');

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
        for: 'ember-data',
        since: {
          available: '3.15',
          enabled: '3.15',
        },
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

// Implicit injection was removed. This is a replacement for Ember Route implicit store for >= v4.0
Route.reopen({
  get store() {
    if (this[EMBER_DATA_STORE]) {
      return this[EMBER_DATA_STORE];
    }

    const store = getOwner(this).lookup('service:store');
    this[EMBER_DATA_STORE] = store;

    deprecate(
      'In 4.0, ember and ember-data removed implicitly injecting the store on all Ember framework objects. However, Ember.Route still needs to support a default store and it looks like you do not have an explicit `@service store` on your Route. Please add this service injection to your Route.',
      false,
      {
        id: 'ember-data:implicit-store-on-route',
        until: '5.0',
        since: {
          available: '4.0',
          enabled: '4.0',
        },
      }
    );

    return store;
  },
  set store(value) {
    this[EMBER_DATA_STORE] = value;
  },
});

export default function setupContainer(application) {
  initializeStore(application);
}
