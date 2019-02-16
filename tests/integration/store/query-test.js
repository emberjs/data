import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import RSVP from 'rsvp';

import { module, test } from 'qunit';

import DS from 'ember-data';

var Person, store, env;

module('integration/store/query', {
  beforeEach() {
    Person = DS.Model.extend();

    env = setupStore({
      person: Person,
    });

    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  },
});

test('meta is proxied correctly on the PromiseArray', function(assert) {
  let defered = RSVP.defer();

  env.owner.register(
    'adapter:person',
    DS.Adapter.extend({
      query(store, type, query) {
        return defered.promise;
      },
    })
  );

  let result;
  run(function() {
    result = store.query('person', {});
  });

  assert.notOk(result.get('meta.foo'), 'precond: meta is not yet set');

  run(function() {
    defered.resolve({ data: [], meta: { foo: 'bar' } });
  });

  assert.equal(result.get('meta.foo'), 'bar');
});
