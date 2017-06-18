import {
  moduleForModel,
  test
} from 'ember-qunit';
import Ember from 'ember';
const {getOwner, run} = Ember;

moduleForModel('baz', {
  needs: [
    'model:complex',
    'model:heavyFoo'
  ]
});

test("unregister then register a record adding a mixin", function(assert) {
  let store = this.store(),
    owner = getOwner(store),
    bazModel,
    bazModel2,
    baz;
  run(() => {
    bazModel = store.modelFor('baz');
    bazModel2 = bazModel.extend({
      newProperty: 'balou'
    });
    //delete owner.__container__.factoryCache['model:baz'];
    owner.unregister('model:baz');
    owner.register('model:baz', bazModel2);
    baz = store.createRecord('baz');//not extended
  });
  assert.equal(baz.get('newProperty'), 'balou');
});
