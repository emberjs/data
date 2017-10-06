import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import RSVP from 'rsvp';

import { module, test } from 'qunit';

import DS from 'ember-data';

var Person, store, env;
var run = Ember.run;

module("integration/store/query", {
  beforeEach() {
    Person = DS.Model.extend();

    env = setupStore({
      person: Person
    });

    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test("meta is proxied correctly on the PromiseArray", function(assert) {
  let defered = RSVP.defer();

  env.registry.register('adapter:person', DS.Adapter.extend({
    query(store, type, query) {
      return defered.promise;
    }
  }));

  let result;
  run(function() {
    result = store.query('person', {});
  });

  assert.equal(result.get('meta.foo'), undefined);

  run(function() {
    defered.resolve({ data: [], meta: { foo: 'bar' } });
  });

  assert.equal(result.get('meta.foo'), 'bar');
});
