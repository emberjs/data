import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

const { get, run } = Ember;

let Person, store, array, moreArray;

module("integration/peek-all - DS.Store#peekAll()", {
  beforeEach() {
    array = {
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: "Scumbag Dale"
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: "Scumbag Katz"
        }
      }]
    };
    moreArray = {
      data: [{
        type: 'person',
        id: '3',
        attributes: {
          name: "Scumbag Bryn"
        }
      }]
    };

    Person = DS.Model.extend({ name: DS.attr('string') });

    store = createStore({ person: Person });
  },
  afterEach() {
    run(store, 'destroy');
    Person = null;
    array = null;
  }
});

test("store.peekAll('person') should return all records and should update with new ones", function(assert) {
  run(() => {
    store.push(array);
  });

  let all = store.peekAll('person');
  assert.equal(get(all, 'length'), 2);

  run(() => {
    store.push(moreArray);
  });

  assert.equal(get(all, 'length'), 3);
});

test("Calling store.peekAll() multiple times should update immediately inside the runloop", function(assert) {
  assert.expect(3);

  Ember.run(() => {
    assert.equal(get(store.peekAll('person'), 'length'), 0, 'should initially be empty');
    store.createRecord('person', { name: "Tomster" });
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tomster's friend"
        }
      }
    });
    assert.equal(get(store.peekAll('person'), 'length'), 2, 'should contain two people');
  });
});

test("Calling store.peekAll() after creating a record should return correct data", function(assert) {
  assert.expect(1);

  Ember.run(() => {
    store.createRecord('person', { name: "Tomster" });
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
  });
});
