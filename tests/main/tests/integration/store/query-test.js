import { module } from 'qunit';
import RSVP from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

module('integration/store/query', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend();

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  deprecatedTest(
    'meta is proxied correctly on the PromiseArray',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0', count: 2 },
    async function (assert) {
      let store = this.owner.lookup('service:store');

      let defered = RSVP.defer();

      this.owner.register(
        'adapter:person',
        Adapter.extend({
          query(store, type, query) {
            return defered.promise;
          },
        })
      );

      let result = store.query('person', {});

      assert.notOk(result.meta?.foo, 'precond: meta is not yet set');

      defered.resolve({ data: [], meta: { foo: 'bar' } });
      await result;

      assert.strictEqual(result.meta?.foo, 'bar', 'meta is now proxied');
    }
  );
});
