import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import testInDebug from 'dummy/tests/helpers/test-in-debug';

import { module, test } from 'qunit';

import DS from 'ember-data';

let env, store, Person;

module('unit/store/peekRecord - Store peekRecord', {
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

test('peekRecord should return the record if it is in the store ', function(assert) {
  run(() => {
    let person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });
    assert.equal(
      person,
      store.peekRecord('person', 1),
      'peekRecord only return the corresponding record in the store'
    );
  });
});

test('peekRecord should return null if the record is not in the store ', function(assert) {
  run(() => {
    assert.equal(
      null,
      store.peekRecord('person', 1),
      'peekRecord returns null if the corresponding record is not in the store'
    );
  });
});

testInDebug('peekRecord should assert if not passed both model name and id', function(assert) {
  run(() => {
    assert.expectAssertion(() => {
      store.peekRecord('my-id');
    }, /You need to pass both a model name and id/);
  });
});

testInDebug('peekRecord should assert if passed a model class instead of model name', function(
  assert
) {
  run(() => {
    assert.expectAssertion(() => {
      let modelClass = Ember.Object.extend();
      store.peekRecord(modelClass, 'id');
    }, /Passing classes to store methods has been removed/);
  });
});
