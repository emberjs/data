import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;
var Person, env, store, adapter;
var run = Ember.run;

module("integration/adapter/queries - Queries", {
  beforeEach() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    env = setupStore({ person: Person });
    store = env.store;
    adapter = env.adapter;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

testInDebug("It raises an assertion when no type is passed", function(assert) {
  assert.expectAssertion(function() {
    store.query();
  }, "You need to pass a type to the store's query method");
});

testInDebug("It raises an assertion when no query hash is passed", function(assert) {
  assert.expectAssertion(function() {
    store.query('person');
  }, "You need to pass a query hash to the store's query method");
});

test("When a query is made, the adapter should receive a record array it can populate with the results of the query.", function(assert) {
  adapter.query = function(store, type, query, recordArray) {
    assert.equal(type, Person, "the query method is called with the correct type");

    return Ember.RSVP.resolve([{ id: 1, name: "Peter Wagenet" }, { id: 2, name: "Brohuda Katz" }]);
  };

  store.query('person', { page: 1 }).then(assert.wait(function(queryResults) {
    assert.equal(get(queryResults, 'length'), 2, "the record array has a length of 2 after the results are loaded");
    assert.equal(get(queryResults, 'isLoaded'), true, "the record array's `isLoaded` property should be true");

    assert.equal(queryResults.objectAt(0).get('name'), "Peter Wagenet", "the first record is 'Peter Wagenet'");
    assert.equal(queryResults.objectAt(1).get('name'), "Brohuda Katz", "the second record is 'Brohuda Katz'");
  }));
});

testInDebug("The store asserts when query is made and the adapter responses with a single record.", function(assert) {
  env = setupStore({ person: Person, adapter: DS.RESTAdapter });
  store = env.store;
  adapter = env.adapter;

  adapter.query = function(store, type, query, recordArray) {
    assert.equal(type, Person, "the query method is called with the correct type");

    return Ember.RSVP.resolve({ people: { id: 1, name: "Peter Wagenet" } });
  };

  assert.expectAssertion(function() {
    Ember.run(function() {
      store.query('person', { page: 1 });
    });
  }, /The response to store.query is expected to be an array but it was a single record/);
});
