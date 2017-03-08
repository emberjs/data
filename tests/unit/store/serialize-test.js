import { module } from 'qunit';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import attr from 'ember-data/attr';
import Model from 'ember-data/model';
import { createStore } from 'dummy/tests/helpers/store';
import Ember from 'ember';
import isEnabled from 'ember-data/-private/features';

const { run } = Ember;

if (isEnabled('ds-deprecate-store-serialize')) {
  module("unit/store/serialize - DS.Store#serialize");

  testInDebug('Store#serialize is deprecated', function(assert) {
    let store = createStore({
      person: Model.extend({ firstName: attr() })
    });

    run(() => {
      let person = store.push({
        data: {
          type: 'person',
          id: 1,
          attributes: {
            firstName: 'original first name'
          }
        }
      });

      assert.expectDeprecation('Use of store.serialize is deprecated, use record.serialize instead.');
      store.serialize(person);
    });

  });
}
