import { type TestContext } from '@ember/test-helpers';
import { module, test, todo } from 'qunit';

import { type WithLegacy } from '@ember-data/model/migration-support';
import { Type } from '@warp-drive/core-types/symbols';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';

import type { WithFragmentArray } from '#src/index.ts';
import { withFragmentArrayDefaults } from '#src/utilities/with-fragment-array-defaults.ts';
import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';
import { withLegacy } from '#src/utilities/with-legacy.ts';
import { type Info, InfoSchema } from '../dummy/models/info.ts';
import { type Order, OrderSchema } from '../dummy/models/order.js';
import { type Product, ProductSchema } from '../dummy/models/product.js';
import { type User, UserSchema } from '../dummy/models/user.js';
import { Store } from '../dummy/services/app-store.ts';
import { setupApplicationTest } from '../helpers';
import Pretender from 'pretender';

interface AppTestContext extends TestContext {
  store: Store;
}

let server: Pretender;

module('Integration - Nested fragments', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function (this: AppTestContext) {
    this.owner.register('service:store', Store);
    this.store = this.owner.lookup('service:store') as Store;
    this.store.schema.registerResources([
      InfoSchema,
      OrderSchema,
      ProductSchema,
      UserSchema,
    ]);
    server = new Pretender();
  });

  hooks.afterEach(function () {
    server.shutdown();
  });

  test('properties can be nested', async function (this: AppTestContext, assert) {
    const data = {
      info: {
        name: 'Tyrion Lannister',
        notes: ['smart', 'short'],
      },
      orders: [
        {
          amount: '799.98',
          products: [
            {
              name: 'Tears of Lys',
              sku: 'poison-bd-32',
              price: '499.99',
            },
            {
              name: 'The Strangler',
              sku: 'poison-md-24',
              price: '299.99',
            },
          ],
        },
        {
          amount: '10999.99',
          products: [
            {
              name: 'Lives of Four Kings',
              sku: 'old-book-32',
              price: '10999.99',
            },
          ],
        },
      ],
    };

    this.store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: data,
      },
    });

    const payload = {
      user: structuredClone(data as unknown as User),
    };

    payload.user.id = '1';
    (payload.user.orders as WithFragmentArray<Order>)[0]!.products.splice(0, 1);

    server.put('/users/1', () => {
      return [
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(payload),
      ];
    });

    const user = await this.store.findRecord<User>('user', '1');

    assert.equal(
      user.orders!.firstObject!.products.firstObject!.name,
      'Tears of Lys',
      'nested fragment array properties are converted properly'
    );

    const product = user.orders!.firstObject!.products.firstObject as Product;

    product.set('price', '1.99');
    assert.ok(user.hasDirtyAttributes, 'dirty state propagates to owner');

    user.rollbackAttributes();
    assert.equal(
      product.price,
      '499.99',
      'rollbackAttributes cascades to nested fragments'
    );
    assert.ok(!user.hasDirtyAttributes, 'dirty state is reset');

    user.orders!.firstObject!.products.removeAt(0);
    assert.ok(user.hasDirtyAttributes, 'dirty state propagates to owner');

    await user.save();

    assert.ok(!user.hasDirtyAttributes, 'owner record is clean');
    assert.equal(
      user.orders!.firstObject!.products.length,
      1,
      'fragment array length is correct'
    );
  });

  test('Fragments can be created with nested object literals', function (this: AppTestContext, assert) {
    const data = {
      info: {
        name: 'Tyrion Lannister',
        notes: ['smart', 'short'],
      },
      orders: [
        {
          amount: '799.98',
          products: [
            {
              name: 'Tears of Lys',
              sku: 'poison-bd-32',
              price: '499.99',
            },
            {
              name: 'The Strangler',
              sku: 'poison-md-24',
              price: '299.99',
            },
          ],
        },
        {
          amount: '10999.99',
          products: [
            {
              name: 'Lives of Four Kings',
              sku: 'old-book-32',
              price: '10999.99',
            },
          ],
        },
      ],
    };

    const user = this.store.createRecord<User>('user', data as User);
    const orders = user.orders as WithFragmentArray<Order>;

    assert.equal(orders.length, 2, 'fragment array length is correct');
    assert.ok(
      orders.firstObject!.$type === 'fragment:order',
      'fragment instances are created'
    );
    assert.equal(
      orders.firstObject!.amount,
      data.orders[0]!.amount,
      'fragment properties are correct'
    );
    assert.equal(
      orders.firstObject!.products.length,
      2,
      'nested fragment array length is correct'
    );
    assert.ok(
      orders.firstObject!.products.firstObject!.$type === 'fragment:product',
      'nested fragment instances are created'
    );
    assert.equal(
      orders.firstObject!.products.firstObject!.name,
      data.orders[0]!.products[0]!.name,
      'nested fragment properties are correct'
    );
  });

  todo(
    'Nested fragments can have default values',
    function (this: AppTestContext, assert) {
      const defaultInfo = {
        notes: ['dangerous', 'sorry'],
      };
      const defaultOrders = [
        {
          amount: '1499.99',
          products: [
            {
              name: 'Live Manticore',
              sku: 'manticore-lv-2',
              price: '1499.99',
            },
          ],
        },
      ];

      const AssassinSchema = withLegacy({
        type: 'assassin',
        fields: [
          withFragmentDefaults('info'),
          withFragmentArrayDefaults('order'),
        ],
      });

      this.store.schema.registerResources([AssassinSchema]);

      type Assassin = WithLegacy<
        WithEmberObject<{
          id: string;
          info: Info | null;
          orders: WithFragmentArray<Order> | null;
          [Type]: 'assassin';
        }>
      >;

      // TODO: add default values from here
      // class Assassin extends Model {
      //   @fragment('info', { defaultValue: defaultInfo }) info;
      //   @fragmentArray('order', { defaultValue: defaultOrders }) orders;
      // }

      const user = this.store.createRecord<Assassin>('assassin', {});

      assert.ok(
        user.info,
        'a nested fragment is created with the default value'
      );
      assert.deepEqual(
        user.info!.notes.toArray(),
        defaultInfo.notes,
        'a doubly nested fragment array is created with the default value'
      );
      assert.ok(
        user.orders!.firstObject,
        'a nested fragment array is created with the default value'
      );
      assert.equal(
        user.orders!.firstObject!.amount,
        defaultOrders[0]!.amount,
        'a nested fragment is created with the default value'
      );
      assert.equal(
        user.orders!.firstObject!.products.firstObject!.name,
        defaultOrders[0]!.products[0]!.name,
        'a nested fragment is created with the default value'
      );
    }
  );
});
