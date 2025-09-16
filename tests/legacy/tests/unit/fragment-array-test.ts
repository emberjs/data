import type { TestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test, todo } from '@warp-drive/diagnostic/ember';

import { type Name, NameSchema } from '../-test-store/schemas/name';
import { type Person, PersonSchema } from '../-test-store/schemas/person';
import type { Prefix } from '../-test-store/schemas/prefix';
import { PrefixSchema } from '../-test-store/schemas/prefix';
import type { Store } from '../-test-store/store';
import { createTestStore } from '../-test-store/store';

interface AppTestContext extends TestContext {
  store: Store;
}

module<AppTestContext>('Unit - `FragmentArray`', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: AppTestContext) {
    this.store = createTestStore(
      {
        schemas: [PersonSchema, NameSchema, PrefixSchema],
      },
      this
    );
  });

  test('fragment arrays have an owner', async function (this: AppTestContext, assert) {
    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Tyrion',
              last: 'Lannister',
            },
          ],
        },
      },
    });

    const person = await this.store.findRecord<Person>('person', '1');
    // @ts-expect-error TODO: fix this type error
    assert.equal(person.names.owner, person);
  });

  test('fragments can be created and added through the fragment array', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Tyrion',
              last: 'Lannister',
            },
          ],
        },
      },
    });

    const fragments = person.names!;

    fragments.createFragment({
      first: 'Hugor',
      last: 'Hill',
    } as Name);

    assert.equal(fragments.length, 2, 'property size is correct');
    assert.satisfies(
      fragments.objectAt(1),
      {
        first: 'Hugor',
        last: 'Hill',
        prefixes: [] as Array<Prefix>,
      },
      'new fragment is in correct location'
    );
  });

  test('fragments can be added to the fragment array', async function (this: AppTestContext, assert) {
    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Tyrion',
              last: 'Lannister',
            },
          ],
        },
      },
    });

    const person = await this.store.findRecord<Person>('person', '1');
    const fragments = person.names!;
    const length = fragments.length;

    fragments.addFragment({
      first: 'Yollo',
    } as Name);

    assert.equal(fragments.length, length + 1, 'property size is correct');
    assert.satisfies(
      // @ts-expect-error TODO: fix this type error
      fragments.objectAt(1),
      {
        first: 'Yollo',
        // TODO: should be `last: null`?
        last: undefined,
        prefixes: [],
      },
      'fragment is in correct location'
    );
  });

  test('objects can be added to the fragment array', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Tyrion',
              last: 'Lannister',
            },
          ],
        },
      },
    });

    const fragments = person.names!;
    const length = fragments.length;
    fragments.addFragment({ first: 'Yollo', last: 'Baggins' } as Name);

    assert.equal(fragments.length, length + 1, 'property size is correct');
    assert.equal(fragments.objectAt(0).first, 'Tyrion');
    assert.equal(fragments.objectAt(0).last, 'Lannister');
    assert.equal(fragments.objectAt(1).first, 'Yollo');
    assert.equal(fragments.objectAt(1).last, 'Baggins');
  });

  test('fragments can be removed from the fragment array', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Arya',
              last: 'Stark',
            },
          ],
        },
      },
    });

    const fragments = person.names!;
    const fragment = fragments.firstObject as Name;
    const length = fragments.length;

    fragments.removeFragment(fragment);

    assert.equal(fragments.length, length - 1, 'property size is correct');
    assert.notOk(fragments.includes(fragment), 'fragment is removed');
  });

  todo(
    'TODO - changes to array contents change the fragment array `hasDirtyAttributes` property',
    function (this: AppTestContext, assert) {
      const person = this.store.push<Person>({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            names: [
              {
                first: 'Aegon',
                last: 'Targaryen',
              },
              {
                first: 'Visenya',
                last: 'Targaryen',
              },
            ],
          },
        },
      });

      const fragments = person.names!;
      const fragment = fragments.firstObject as Name;
      const newFragment = {
        first: 'Rhaenys',
        last: 'Targaryen',
      } as Name;

      assert.ok(!fragments.hasDirtyAttributes, 'fragment array is initially in a clean state');

      fragments.removeFragment(fragment);

      assert.ok(fragments.hasDirtyAttributes, 'fragment array is in dirty state after removal');

      fragments.unshiftObject(fragment);

      assert.ok(!fragments.hasDirtyAttributes, 'fragment array is returned to clean state');

      fragments.addFragment(newFragment);

      assert.ok(fragments.hasDirtyAttributes, 'fragment array is in dirty state after addition');

      fragments.removeFragment(newFragment);

      assert.ok(!fragments.hasDirtyAttributes, 'fragment array is returned to clean state');

      fragments.removeFragment(fragment);
      fragments.addFragment(fragment);

      assert.ok(fragments.hasDirtyAttributes, 'fragment array is in dirty state after reordering');

      fragments.removeFragment(fragment);
      fragments.unshiftObject(fragment);

      assert.ok(!fragments.hasDirtyAttributes, 'fragment array is returned to clean state');
    }
  );

  test('changes to array contents change the fragment array `hasDirtyAttributes` property', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Jon',
              last: 'Snow',
            },
          ],
        },
      },
    });

    const fragments = person.names!;
    const fragment = fragments.firstObject as Name;

    assert.notOk(fragments.hasDirtyAttributes, 'fragment array is initially in a clean state');

    fragment.set('last', 'Stark');

    assert.ok(fragments.hasDirtyAttributes, 'fragment array in dirty state after change to a fragment');

    fragment.set('last', 'Snow');

    assert.notOk(fragments.hasDirtyAttributes, 'fragment array is returned to clean state');
  });

  test('changes to array contents and fragments can be rolled back', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Catelyn',
              last: 'Tully',
            },
            {
              first: 'Catelyn',
              last: 'Stark',
            },
          ],
        },
      },
    });

    const fragments = person.names!;
    const fragment = fragments.firstObject as Name;

    const originalState = fragments.toArray();

    fragment.set('first', 'Cat');
    fragments.removeFragment(fragments.lastObject);
    fragments.createFragment({
      first: 'Lady',
      last: 'Stonehart',
    } as Name);

    // @ts-expect-error TODO: fix this type error
    fragments.rollbackAttributes();

    assert.notOk(fragments.hasDirtyAttributes, 'fragment array is not dirty');
    assert.notOk(fragments.isAny('hasDirtyAttributes', true), 'all fragments are in clean state');
    assert.deepEqual(fragments.toArray(), originalState, 'original array contents is restored');
  });

  test('can be created with null', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: null,
        },
      },
    });

    assert.equal(person.names, null, 'when set to null, fragment array is null');
  });

  test('can be updated to null', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: [
            {
              first: 'Catelyn',
              last: 'Tully',
            },
            {
              first: 'Catelyn',
              last: 'Stark',
            },
          ],
        },
      },
    });

    assert.satisfies(person.names!.slice(), [
      {
        first: 'Catelyn',
        last: 'Tully',
      },
      {
        first: 'Catelyn',
        last: 'Stark',
      },
    ] as unknown as Name[]);

    assert.deepEqual(person.names?.[0]?.prefixes.slice(), []);

    this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          names: null,
        },
      },
    });

    assert.equal(person.names, null, 'when set to null, fragment array is null');
  });
});
