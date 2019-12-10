import { A } from '@ember/array';

import { module, test } from 'qunit';
import { Promise as EmberPromise } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('PromiseManyArray', function() {
  test('.reload should NOT leak the internal promise, rather return another promiseArray', function(assert) {
    assert.expect(2);

    let content = A();

    content.reload = () => EmberPromise.resolve(content);

    let array = DS.PromiseManyArray.create({
      content,
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
      promise,
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

    let content = A([1, 2, 3]);

    let promise = EmberPromise.resolve(content);

    let array = DS.PromiseManyArray.create({
      promise,
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
});

module('unit/PromiseBelongsTo', function(hooks) {
  setupTest(hooks);

  class Parent extends Model {
    @belongsTo('child', { async: true })
    child;
  }
  class Child extends Model {
    @belongsTo('parent', { async: false })
    parent;
  }
  class ChildAdapter extends Adapter {
    findRecord(store, type, id, snapshot) {
      const ChildRecord = {
        data: {
          id: '1',
          type: 'child',
          relationships: {
            parent: {
              data: {
                id: 1,
                type: 'parent',
              },
            },
          },
        },
      };
      return EmberPromise.resolve(ChildRecord);
    }
  }

  test('meta property exists', function(assert) {
    const { owner } = this;
    owner.register('model:parent', Parent);
    owner.register('model:child', Child);
    owner.register('adapter:child', ChildAdapter);
    owner.register('serializer:application', JSONAPISerializer.extend());
    const store = owner.lookup('service:store');
    const meta = {
      example: 'example meta',
    };
    const parent = store.push({
      data: {
        id: '1',
        type: 'parent',
        relationships: {
          child: {
            data: {
              type: 'child',
              id: '1',
            },
            meta,
          },
        },
      },
    });

    const belongsToProxy = parent.child;

    assert.expectAssertion(() => {
      belongsToProxy.get('meta');
    }, 'You attempted to access meta on the promise for the async belongsTo relationship ' + `child:child'.` + '\nUse `record.belongsTo(relationshipName).meta()` instead.');
    assert.equal(parent.belongsTo('child').meta(), meta);
  });
});
