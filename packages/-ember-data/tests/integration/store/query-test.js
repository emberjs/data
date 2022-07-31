import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import RSVP from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/store/query', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = DS.Model.extend();

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', DS.Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('meta is proxied correctly on the PromiseArray', function (assert) {
    let store = this.owner.lookup('service:store');

    let defered = RSVP.defer();

    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        query(store, type, query) {
          return defered.promise;
        },
      })
    );

    let result;
    run(function () {
      result = store.query('person', {});
    });

    assert.notOk(result.get('meta.foo'), 'precond: meta is not yet set');

    run(function () {
      defered.resolve({ data: [], meta: { foo: 'bar' } });
    });

    assert.strictEqual(result.get('meta.foo'), 'bar');
  });
});
