import { A } from '@ember/array';

import { module, test } from 'qunit';
import { Promise as EmberPromise } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('PromiseManyArray', function () {
  test('.reload should NOT leak the internal promise, rather return another promiseArray', function (assert) {
    assert.expect(1);

    let content = A();

    content.reload = () => EmberPromise.resolve(content);

    let array = DS.PromiseManyArray.create({
      content,
    });

    let reloaded = array.reload();

    assert.ok(reloaded === array);
  });

  test('.reload should be stable', async function (assert) {
    assert.expect(19);

    let content = A();
    let array;

    content.reload = () => {
      let p = EmberPromise.resolve(content);
      array._update(p);
      return p;
    };
    let promise = EmberPromise.resolve(content);

    array = DS.PromiseManyArray.create({
      promise,
    });

    assert.false(array.isRejected, 'should NOT be rejected');
    assert.true(array.isPending, 'should be pending');
    assert.false(array.isSettled, 'should NOT be settled');
    assert.false(array.isFulfilled, 'should NOT be fulfilled');

    await array;
    assert.false(array.isRejected, 'should NOT be rejected');
    assert.false(array.isPending, 'should NOT be pending');
    assert.true(array.isSettled, 'should be settled');
    assert.true(array.isFulfilled, 'should be fulfilled');

    let reloaded = array.reload();

    assert.false(array.isRejected, 'should NOT be rejected');
    assert.true(array.isPending, 'should be pending');
    assert.false(array.isSettled, 'should NOT be settled');
    assert.false(array.isFulfilled, 'should NOT be fulfilled');

    assert.ok(reloaded instanceof DS.PromiseManyArray);
    assert.strictEqual(reloaded, array);

    let value = await reloaded;
    assert.false(array.isRejected, 'should NOT be rejected');
    assert.false(array.isPending, 'should NOT be pending');
    assert.true(array.isSettled, 'should be settled');
    assert.true(array.isFulfilled, 'should be fulfilled');

    assert.strictEqual(content, value);
  });

  test('.set to new promise should be like reload', async function (assert) {
    assert.expect(18);

    let content = A([1, 2, 3]);

    let promise = EmberPromise.resolve(content);

    let array = DS.PromiseManyArray.create({
      promise,
    });

    assert.false(array.isRejected, 'should NOT be rejected');
    assert.true(array.isPending, 'should be pending');
    assert.false(array.isSettled, 'should NOT be settled');
    assert.false(array.isFulfilled, 'should NOT be fulfilled');

    await array;
    assert.false(array.isRejected, 'should NOT be rejected');
    assert.false(array.isPending, 'should NOT be pending');
    assert.true(array.isSettled, 'should be settled');
    assert.true(array.isFulfilled, 'should be fulfilled');

    array._update(EmberPromise.resolve(content));

    assert.false(array.isRejected, 'should NOT be rejected');
    assert.true(array.isPending, 'should be pending');
    assert.false(array.isSettled, 'should NOT be settled');
    assert.false(array.isFulfilled, 'should NOT be fulfilled');

    assert.ok(array instanceof DS.PromiseManyArray);

    let value = await array;
    assert.false(array.isRejected, 'should NOT be rejected');
    assert.false(array.isPending, 'should NOT be pending');
    assert.true(array.isSettled, 'should be settled');
    assert.true(array.isFulfilled, 'should be fulfilled');

    assert.strictEqual(content, value);
  });
});

module('unit/PromiseBelongsTo', function (hooks) {
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

  test('meta property exists', function (assert) {
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
    assert.strictEqual(parent.belongsTo('child').meta(), meta);
  });
});
