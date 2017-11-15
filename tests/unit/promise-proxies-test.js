import { Promise as EmberPromise } from 'rsvp';
import { A } from '@ember/array';

import { module, test } from 'qunit';

import DS from 'ember-data';

module('PromiseManyArray');

test('.reload should NOT leak the internal promise, rather return another promiseArray', function(assert) {
  assert.expect(2);

  let content = A();

  content.reload = () => EmberPromise.resolve(content);

  let array = DS.PromiseManyArray.create({
    content
  });

  let reloaded = array.reload();

  assert.ok(reloaded instanceof DS.PromiseManyArray);

  return reloaded.then(value => assert.equal(content, value));
});

test('.reload should be stable', function(assert) {
  assert.expect(19);

  let content = A();

  content.reload = () => EmberPromise.resolve(content);
  let promise = EmberPromise.resolve(content);

  let array = DS.PromiseManyArray.create({
    promise
  });

  assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
  assert.equal(array.get('isPending'), true, 'should be pending');
  assert.equal(array.get('isSettled'), false, 'should NOT be settled');
  assert.equal(array.get('isFulfilled'), false, 'should NOT be fulfilled');

  return array.then(() => {
    assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
    assert.equal(array.get('isPending'), false, 'should NOT be pending');
    assert.equal(array.get('isSettled'), true, 'should be settled');
    assert.equal(array.get('isFulfilled'), true, 'should be fulfilled');

    let reloaded = array.reload();

    assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
    assert.equal(array.get('isPending'), true, 'should be pending');
    assert.equal(array.get('isSettled'), false, 'should NOT be settled');
    assert.equal(array.get('isFulfilled'), false, 'should NOT be fulfilled');

    assert.ok(reloaded instanceof DS.PromiseManyArray);
    assert.equal(reloaded, array);

    return reloaded.then(value => {
      assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
      assert.equal(array.get('isPending'), false, 'should NOT be pending');
      assert.equal(array.get('isSettled'), true, 'should be settled');
      assert.equal(array.get('isFulfilled'), true, 'should be fulfilled');

      assert.equal(content, value);
    });
  });
});

test('.set to new promise should be like reload', function(assert) {
  assert.expect(18);

  let content = A([1,2,3]);

  let promise = EmberPromise.resolve(content);

  let array = DS.PromiseManyArray.create({
    promise
  });

  assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
  assert.equal(array.get('isPending'), true, 'should be pending');
  assert.equal(array.get('isSettled'), false, 'should NOT be settled');
  assert.equal(array.get('isFulfilled'), false, 'should NOT be fulfilled');

  return array.then(() => {
    assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
    assert.equal(array.get('isPending'), false, 'should NOT be pending');
    assert.equal(array.get('isSettled'), true, 'should be settled');
    assert.equal(array.get('isFulfilled'), true, 'should be fulfilled');

    array.set('promise', EmberPromise.resolve(content));

    assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
    assert.equal(array.get('isPending'), true, 'should be pending');
    assert.equal(array.get('isSettled'), false, 'should NOT be settled');
    assert.equal(array.get('isFulfilled'), false, 'should NOT be fulfilled');

    assert.ok(array instanceof DS.PromiseManyArray);

    return array.then(value => {
      assert.equal(array.get('isRejected'), false, 'should NOT be rejected');
      assert.equal(array.get('isPending'), false, 'should NOT be pending');
      assert.equal(array.get('isSettled'), true, 'should be settled');
      assert.equal(array.get('isFulfilled'), true, 'should be fulfilled');

      assert.equal(content, value);
    });
  });
});

