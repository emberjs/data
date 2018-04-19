import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';
import { getOwner } from 'ember-data/-private';

let Baz, store, env;

module('unit/unregister_model - DS.Model', {
  beforeEach() {
    Baz = DS.Model.extend({});
    Baz.toString =  () => 'baz';

    env = setupStore({
      adapter: DS.JSONAPIAdapter,
      baz: Baz
    });
    store = env.store;
  },

  afterEach() {
    run(() => store.destroy());
  }
});

test("unregister then register a record adding a mixin", function(assert) {
  let owner = getOwner(store),
    bazModel,
    bazModel2,
    baz;
  run(() => {
    bazModel = store.modelFor('baz');
    bazModel2 = bazModel.extend({
      newProperty: 'balou'
    });
    //delete owner.__container__.factoryManagerCache['model:baz'];
    owner.unregister('model:baz');
    owner.register('model:baz', bazModel2);
    baz = store.createRecord('baz');//not extended
  });
  assert.equal(baz.get('newProperty'), 'balou');
});
