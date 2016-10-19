import DS from 'ember-data';
import Ember from 'ember';
import { module, test } from 'qunit';

const { get, RSVP } = Ember;
const { RecordArray } = DS;

module('unit/record-arrays/record-array - DS.RecordArray');

test('default initial state', function(assert) {
  let recordArray = RecordArray.create({ type: 'recordType' });

  assert.equal(get(recordArray, 'isLoaded'), false);
  assert.equal(get(recordArray, 'isUpdating'), false);
  assert.equal(get(recordArray, 'type'), 'recordType');
  assert.equal(get(recordArray, 'content'), null);
  assert.equal(get(recordArray, 'store'), null);
});

test('custom initial state', function(assert) {
  let content = [];
  let store = {};
  let recordArray = RecordArray.create({
    type: 'apple',
    isLoaded: true,
    isUpdating: true,
    content,
    store
  })
  assert.equal(get(recordArray, 'isLoaded'), true);
  assert.equal(get(recordArray, 'isUpdating'), false); // cannot set as default value:
  assert.equal(get(recordArray, 'type'), 'apple');
  assert.equal(get(recordArray, 'content'), content);
  assert.equal(get(recordArray, 'store'), store);
});

test('#replace() throws error', function(assert) {
  let recordArray = RecordArray.create({ type: 'recordType' });

  assert.throws(function() {
    recordArray.replace();
  }, Error('The result of a server query (for all recordType types) is immutable. To modify contents, use toArray()'), 'throws error');
});

test('#objectAtContent', function(assert) {
  let content = Ember.A([
    { getRecord() { return 'foo'; }},
    { getRecord() { return 'bar'; }},
    { getRecord() { return 'baz'; }}
  ]);

  let recordArray = RecordArray.create({
    type: 'recordType',
    content
  });

  assert.equal(get(recordArray, 'length'), 3);
  assert.equal(recordArray.objectAtContent(0), 'foo');
  assert.equal(recordArray.objectAtContent(1), 'bar');
  assert.equal(recordArray.objectAtContent(2), 'baz');
  assert.equal(recordArray.objectAtContent(3), undefined);
});


test('#update', function(assert) {
  let findAllCalled = 0;
  let deferred = RSVP.defer();

  const store = {
    findAll(modelName, options) {
      findAllCalled++;
      assert.equal(modelName, 'recordType');
      assert.equal(options.reload, true, 'options should contain reload: true');
      return deferred.promise;
    }
  };

  let recordArray = RecordArray.create({
    type: { modelName: 'recordType' },
    store
  });

  assert.equal(get(recordArray, 'isUpdating'), false, 'should not yet be updating');

  assert.equal(findAllCalled, 0);

  let updateResult = recordArray.update();

  assert.equal(findAllCalled, 1);

  deferred.resolve('return value');

  assert.equal(get(recordArray, 'isUpdating'), true, 'should be updating');

  return updateResult.then(result => {
    assert.equal(result, 'return value');
    assert.equal(get(recordArray, 'isUpdating'), false, 'should no longer be updating');
  });
});


test('#update while updating', function(assert) {
  let findAllCalled = 0;
  let deferred = RSVP.defer();
  const store = {
    findAll(modelName, options) {
      findAllCalled++;
      return deferred.promise;
    }
  };

  let recordArray = RecordArray.create({
    type: { modelName: 'recordType' },
    store
  });

  assert.equal(get(recordArray, 'isUpdating'), false, 'should not be updating');
  assert.equal(findAllCalled, 0);

  let updateResult1 = recordArray.update();

  assert.equal(findAllCalled, 1);

  let updateResult2 = recordArray.update();

  assert.equal(findAllCalled, 1);

  assert.equal(updateResult1, updateResult2);

  deferred.resolve('return value');

  assert.equal(get(recordArray, 'isUpdating'), true, 'should be updating');

  return updateResult1.then(result => {
    assert.equal(result, 'return value');
    assert.equal(get(recordArray, 'isUpdating'), false, 'should no longer be updating');
  });
});
