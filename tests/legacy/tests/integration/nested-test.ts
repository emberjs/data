import type { Type } from '@warp-drive/core-types/symbols';
import type { TestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test, todo } from '@warp-drive/diagnostic/ember';
import { PUT } from '@warp-drive/holodeck/mock';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';
import type { WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { WithFragmentArray } from '@warp-drive/legacy/model-fragments';
import { withFragmentArrayDefaults, withFragmentDefaults, withLegacy } from '@warp-drive/legacy/model-fragments';

import { type Info, InfoSchema } from '../-test-store/schemas/info.ts';
import { type Order, OrderSchema } from '../-test-store/schemas/order.js';
import { type Product, ProductSchema } from '../-test-store/schemas/product.js';
import { type User, UserSchema } from '../-test-store/schemas/user.js';
import type { Store } from '../-test-store/store.ts';
import { createTestStore } from '../-test-store/store.ts';

interface AppTestContext extends TestContext {
  store: Store;
}

module('Integration - Nested fragments', function (hooks) {
  setupRenderingTest(hooks);

  // @ts-expect-error TODO: fix this type error
  hooks.beforeEach(function (this: AppTestContext) {
    this.store = createTestStore(
      {
        schemas: [InfoSchema, OrderSchema, ProductSchema, UserSchema],
      },
      this
    );
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

    await PUT(
      this,
      '/users/1',
      () => {
        const payload = {
          user: structuredClone(data as unknown as User),
        };

        payload.user.id = '1';
        payload.user.orders![0].products.splice(0, 1);
        return payload;
      },
      {
        body: '{"user":{"info":{"name":"Tyrion Lannister","notes":["smart","short"]},"orders":[{"amount":"799.98","products":[{}]},{"amount":"10999.99","products":[{"name":"Lives of Four Kings","sku":"old-book-32","price":"10999.99"}]}]}}',
      }
    );

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
    assert.equal(product.price, '499.99', 'rollbackAttributes cascades to nested fragments');
    assert.notOk(user.hasDirtyAttributes, 'dirty state is reset');

    user.orders!.firstObject!.products.removeAt(0);
    assert.ok(user.hasDirtyAttributes, 'dirty state propagates to owner');

    await user.save();

    assert.notOk(user.hasDirtyAttributes, 'owner record is clean');
    assert.equal(user.orders!.firstObject!.products.length, 1, 'fragment array length is correct');
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
    assert.ok(orders.firstObject!.$type === 'fragment:order', 'fragment instances are created');
    assert.equal(orders.firstObject!.amount, data.orders[0].amount, 'fragment properties are correct');
    assert.equal(orders.firstObject!.products.length, 2, 'nested fragment array length is correct');
    assert.ok(
      orders.firstObject!.products.firstObject!.$type === 'fragment:product',
      'nested fragment instances are created'
    );
    assert.equal(
      orders.firstObject!.products.firstObject!.name,
      data.orders[0].products[0].name,
      'nested fragment properties are correct'
    );
  });

  todo('Nested fragments can have default values', function (this: AppTestContext, assert) {
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
      fields: [withFragmentDefaults('info'), withFragmentArrayDefaults('order')],
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

    assert.ok(user.info, 'a nested fragment is created with the default value');
    assert.equal(
      user.info!.notes.toArray(),
      defaultInfo.notes,
      'a doubly nested fragment array is created with the default value'
    );
    assert.ok(user.orders!.firstObject, 'a nested fragment array is created with the default value');
    assert.equal(
      user.orders!.firstObject!.amount,
      defaultOrders[0].amount,
      'a nested fragment is created with the default value'
    );
    assert.equal(
      user.orders!.firstObject!.products.firstObject!.name,
      defaultOrders[0].products[0].name,
      'a nested fragment is created with the default value'
    );
  });
});
