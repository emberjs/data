import {module} from 'qunit';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {createStore} from 'dummy/tests/helpers/store';

module('unit/store/asserts - DS.Store methods produce useful assertion messages');

const MODEL_NAME_METHODS = [
  'createRecord',
  'findRecord',
  'findByIds',
  'peekRecord',
  'hasRecordForId',
  'recordForId',
  'query',
  'queryRecord',
  'findAll',
  'peekAll',
  'filter',
  'modelFor',
  'modelFactoryFor',
  'normalize',
  'adapterFor',
  'serializerFor'
];

testInDebug('Calling Store methods with no modelName asserts', function(assert) {
  assert.expect(MODEL_NAME_METHODS.length);
  let store = createStore();

  MODEL_NAME_METHODS.forEach(methodName =>{
    assert.expectAssertion(() => {
      store[methodName](null);
    }, new RegExp(`You need to pass a model name to the store's ${methodName} method`));
  });
});
