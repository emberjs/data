import DS from 'ember-data';
import Ember from 'ember';
import { module, test } from 'qunit';

const { get, RSVP, run } = Ember;
const { RecordArray } = DS;

module('unit/record-arrays/record-array - DS.RecordArray');

test('default initial state', function(assert) {
  let recordArray = RecordArray.create({ modelName: 'recordType' });

  assert.equal(get(recordArray, 'isLoaded'), false);
  assert.equal(get(recordArray, 'isUpdating'), false);
  assert.equal(get(recordArray, 'modelName'), 'recordType');
  assert.equal(get(recordArray, 'content'), null);
  assert.equal(get(recordArray, 'store'), null);
});

test('custom initial state', function(assert) {
  let content = Ember.A();
  let store = {};
  let recordArray = RecordArray.create({
    modelName: 'apple',
    isLoaded: true,
    isUpdating: true,
    content,
    store
  });
  assert.equal(get(recordArray, 'isLoaded'), true);
  assert.equal(get(recordArray, 'isUpdating'), false); // cannot set as default value:
  assert.equal(get(recordArray, 'modelName'), 'apple');
  assert.equal(get(recordArray, 'content'), content);
  assert.equal(get(recordArray, 'store'), store);
});

test('#replace() throws error', function(assert) {
  let recordArray = RecordArray.create({ modelName: 'recordType' });

  assert.throws(() => {
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
    modelName: 'recordType',
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
    modelName: 'recordType',
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
    modelName: { modelName: 'recordType' },
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

test('#_pushInternalModels', function(assert) {
  let content = Ember.A();
  let recordArray = RecordArray.create({
    content
  });

  let model1 = { id: 1, getRecord() { return 'model-1'; } };
  let model2 = { id: 2, getRecord() { return 'model-2'; } };
  let model3 = { id: 3, getRecord() { return 'model-3'; } };

  assert.equal(recordArray._pushInternalModels([model1]), undefined, '_pushInternalModels has no return value');
  assert.deepEqual(content, [model1], 'now contains model1');

  recordArray._pushInternalModels([model1]);
  assert.deepEqual(content, [model1, model1], 'allows duplicates, because record-array-manager via internalModel._recordArrays ensures no duplicates, this layer should not double check');

  recordArray._removeInternalModels([model1]);
  recordArray._pushInternalModels([model1]);

  // can add multiple models at once
  recordArray._pushInternalModels([model2, model3]);
  assert.deepEqual(content, [model1, model2, model3], 'now contains model1, model2, model3');
});

test('#_removeInternalModels', function(assert) {
  let content = Ember.A();
  let recordArray = RecordArray.create({
    content
  });

  let model1 = { id: 1, getRecord() { return 'model-1'; } };
  let model2 = { id: 2, getRecord() { return 'model-2'; } };
  let model3 = { id: 3, getRecord() { return 'model-3'; } };

  assert.equal(content.length, 0);
  assert.equal(recordArray._removeInternalModels([model1]), undefined, '_removeInternalModels has no return value');
  assert.deepEqual(content, [], 'now contains no models');

  recordArray._pushInternalModels([model1, model2]);

  assert.deepEqual(content, [model1, model2], 'now contains model1, model2,');
  assert.equal(recordArray._removeInternalModels([model1]), undefined, '_removeInternalModels has no return value');
  assert.deepEqual(content, [model2], 'now only contains model2');
  assert.equal(recordArray._removeInternalModels([model2]), undefined, '_removeInternalModels has no return value');
  assert.deepEqual(content, [], 'now contains no models');

  recordArray._pushInternalModels([model1, model2, model3])

  assert.equal(recordArray._removeInternalModels([model1, model3]), undefined, '_removeInternalModels has no return value');

  assert.deepEqual(content, [model2], 'now contains model2');
  assert.equal(recordArray._removeInternalModels([model2]), undefined, '_removeInternalModels has no return value');
  assert.deepEqual(content, [], 'now contains no models');
});

class FakeInternalModel {
  constructor(record) {
    this._record = record;
    this.__recordArrays = null;
  }

  get _recordArrays() {
    return this.__recordArrays;
  }

  getRecord() { return this._record; }

  createSnapshot() {
    return this._record;
  }
}

function internalModelFor(record) {
  return new FakeInternalModel(record);
}

test('#save', function(assert) {
  let model1 = { save() { model1Saved++; return this;} };
  let model2 = { save() { model2Saved++; return this;} };
  let content = Ember.A([
    internalModelFor(model1),
    internalModelFor(model2)
  ]);

  let recordArray = RecordArray.create({
    content
  });

  let model1Saved = 0;
  let model2Saved = 0;

  assert.equal(model1Saved, 0);
  assert.equal(model2Saved, 0);

  let result = recordArray.save();

  assert.equal(model1Saved, 1);
  assert.equal(model2Saved, 1);

  return result.then(result => {
    assert.equal(result, result, 'save promise should fulfill with the original recordArray');
  });
});

test('#destroy', function(assert) {
  let didUnregisterRecordArray = 0;
  let didDissociatieFromOwnRecords  = 0;
  let model1 = { };
  let internalModel1 = internalModelFor(model1);

  // TODO: this will be removed once we fix ownership related memory leaks.
  internalModel1.__recordArrays = {
    delete(array) {
      didDissociatieFromOwnRecords++;
      assert.equal(array, recordArray);
    }
  };
  // end TODO:

  let recordArray = RecordArray.create({
    content: Ember.A([internalModel1]),
    manager: {
      unregisterRecordArray(_recordArray) {
        didUnregisterRecordArray++;
        assert.equal(recordArray, _recordArray);
      }
    }
  });

  assert.equal(get(recordArray, 'isDestroyed'), false, 'should not be destroyed');
  assert.equal(get(recordArray, 'isDestroying'), false, 'should not be destroying');

  run(() => {
    assert.equal(get(recordArray, 'length'), 1, 'before destroy, length should be 1');
    assert.equal(didUnregisterRecordArray, 0, 'before destroy, we should not yet have unregisterd the record array');
    assert.equal(didDissociatieFromOwnRecords, 0, 'before destroy, we should not yet have dissociated from own record array');
    recordArray.destroy();
  });

  assert.equal(didUnregisterRecordArray, 1, 'after destroy we should have unregistered the record array');
  assert.equal(didDissociatieFromOwnRecords, 1, 'after destroy, we should have dissociated from own record array');
  recordArray.destroy();

  assert.equal(get(recordArray, 'content'), null);
  assert.equal(get(recordArray, 'length'), 0, 'after destroy we should have no length');
  assert.equal(get(recordArray, 'isDestroyed'), true, 'should be destroyed');
});

test('#_createSnapshot', function(assert) {
  let model1 = {
    id: 1
  };

  let model2 = {
    id: 2
  };

  let content = Ember.A([
    internalModelFor(model1),
    internalModelFor(model2)
  ]);

  let recordArray = RecordArray.create({
    content
  });

  let snapshot = recordArray._createSnapshot();
  let snapshots = snapshot.snapshots();

  assert.deepEqual(snapshots, [
    model1,
    model2
  ], 'record array snapshot should contain the internalModel.createSnapshot result');
});

test('#destroy', function(assert) {
  let didUnregisterRecordArray = 0;
  let didDissociatieFromOwnRecords  = 0;
  let model1 = { };
  let internalModel1 = internalModelFor(model1);

  // TODO: this will be removed once we fix ownership related memory leaks.
  internalModel1.__recordArrays = {
    delete(array) {
      didDissociatieFromOwnRecords++;
      assert.equal(array, recordArray);
    }
  };
  // end TODO:

  let recordArray = RecordArray.create({
    content: Ember.A([internalModel1]),
    manager: {
      unregisterRecordArray(_recordArray) {
        didUnregisterRecordArray++;
        assert.equal(recordArray, _recordArray);
      }
    }
  });

  assert.equal(get(recordArray, 'isDestroyed'), false, 'should not be destroyed');
  assert.equal(get(recordArray, 'isDestroying'), false, 'should not be destroying');

  run(() => {
    assert.equal(get(recordArray, 'length'), 1, 'before destroy, length should be 1');
    assert.equal(didUnregisterRecordArray, 0, 'before destroy, we should not yet have unregisterd the record array');
    assert.equal(didDissociatieFromOwnRecords, 0, 'before destroy, we should not yet have dissociated from own record array');
    recordArray.destroy();
  });

  assert.equal(didUnregisterRecordArray, 1, 'after destroy we should have unregistered the record array');
  assert.equal(didDissociatieFromOwnRecords, 1, 'after destroy, we should have dissociated from own record array');
  recordArray.destroy();

  assert.equal(get(recordArray, 'content'), null);
  assert.equal(get(recordArray, 'length'), 0, 'after destroy we should have no length');
  assert.equal(get(recordArray, 'isDestroyed'), true, 'should be destroyed');
});

