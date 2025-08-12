import { type TestContext } from '@ember/test-helpers';
import { module, test, todo } from 'qunit';

import type { WithFragmentArray } from '#src/index.ts';
import { type Name, NameSchema } from '../dummy/models/name';
import { type Person, PersonSchema } from '../dummy/models/person';
import { PrefixSchema } from '../dummy/models/prefix';
import { Store } from '../dummy/services/app-store';
import { setupApplicationTest } from '../helpers';

interface AppTestContext extends TestContext {
  store: Store;
}

module('Unit - `FragmentArray`', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function (this: AppTestContext) {
    this.owner.register('service:store', Store);
    this.store = this.owner.lookup('service:store') as Store;
    this.store.schema.registerResources([
      PersonSchema,
      NameSchema,
      PrefixSchema,
    ]);
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
    // @ts-expect-error TODO: do we actually have owner and do we need it?
    assert.strictEqual(person.names.owner, person);
  });

  test('fragments can be created and added through the fragment array', async function (this: AppTestContext, assert) {
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
    const fragments = person.names as WithFragmentArray<Name>;
    const length = fragments.length;

    fragments.createFragment({
      first: 'Hugor',
      last: 'Hill',
    } as Name);

    assert.equal(fragments.length, length + 1, 'property size is correct');
    assert.propEqual(
      fragments.objectAt(1),
      {
        first: 'Hugor',
        last: 'Hill',
        prefixes: [],
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
    const fragments = person.names as WithFragmentArray<Name>;
    const length = fragments.length;

    fragments.addFragment({
      first: 'Yollo',
    } as Name);

    assert.equal(fragments.length, length + 1, 'property size is correct');
    assert.propEqual(
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

  test('objects can be added to the fragment array', async function (this: AppTestContext, assert) {
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
    const fragments = person.names as WithFragmentArray<Name>;
    const length = fragments.length;
    fragments.addFragment({ first: 'Yollo', last: 'Baggins' } as Name);

    assert.equal(fragments.length, length + 1, 'property size is correct');
    assert.equal(fragments.objectAt(0).first, 'Tyrion');
    assert.equal(fragments.objectAt(0).last, 'Lannister');
    assert.equal(fragments.objectAt(1).first, 'Yollo');
    assert.equal(fragments.objectAt(1).last, 'Baggins');
  });

  test('fragments can be removed from the fragment array', async function (this: AppTestContext, assert) {
    this.store.push({
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

    const person = await this.store.findRecord<Person>('person', '1');
    const fragments = person.names as WithFragmentArray<Name>;
    const fragment = fragments.firstObject as Name;
    const length = fragments.length;

    fragments.removeFragment(fragment);

    assert.equal(fragments.length, length - 1, 'property size is correct');
    assert.ok(!fragments.includes(fragment), 'fragment is removed');
  });

  todo(
    'changes to array contents change the fragment array `hasDirtyAttributes` property',
    async function (this: AppTestContext, assert) {
      this.store.push({
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

      const person = await this.store.findRecord<Person>('person', '1');
      const fragments = person.names as WithFragmentArray<Name>;
      const fragment = fragments.firstObject as Name;
      const newFragment = {
        first: 'Rhaenys',
        last: 'Targaryen',
      } as Name;

      assert.ok(
        !fragments.hasDirtyAttributes,
        'fragment array is initially in a clean state'
      );

      fragments.removeFragment(fragment);

      assert.ok(
        fragments.hasDirtyAttributes,
        'fragment array is in dirty state after removal'
      );

      fragments.unshiftObject(fragment);

      assert.ok(
        !fragments.hasDirtyAttributes,
        'fragment array is returned to clean state'
      );

      fragments.addFragment(newFragment);

      assert.ok(
        fragments.hasDirtyAttributes,
        'fragment array is in dirty state after addition'
      );

      fragments.removeFragment(newFragment);

      assert.ok(
        !fragments.hasDirtyAttributes,
        'fragment array is returned to clean state'
      );

      fragments.removeFragment(fragment);
      fragments.addFragment(fragment);

      assert.ok(
        fragments.hasDirtyAttributes,
        'fragment array is in dirty state after reordering'
      );

      fragments.removeFragment(fragment);
      fragments.unshiftObject(fragment);

      assert.ok(
        !fragments.hasDirtyAttributes,
        'fragment array is returned to clean state'
      );
    }
  );

  test('changes to array contents change the fragment array `hasDirtyAttributes` property', async function (this: AppTestContext, assert) {
    this.store.push({
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

    const person = await this.store.findRecord<Person>('person', '1');
    const fragments = person.names as WithFragmentArray<Name>;
    const fragment = fragments.firstObject as Name;

    assert.ok(
      !fragments.hasDirtyAttributes,
      'fragment array is initially in a clean state'
    );

    fragment.set('last', 'Stark');

    assert.ok(
      fragments.hasDirtyAttributes,
      'fragment array in dirty state after change to a fragment'
    );

    fragment.set('last', 'Snow');

    assert.ok(
      !fragments.hasDirtyAttributes,
      'fragment array is returned to clean state'
    );
  });

  test('changes to array contents and fragments can be rolled back', async function (this: AppTestContext, assert) {
    this.store.push({
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

    const person = await this.store.findRecord<Person>('person', '1');
    const fragments = person.names as WithFragmentArray<Name>;
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

    assert.ok(!fragments.hasDirtyAttributes, 'fragment array is not dirty');
    assert.ok(
      // @ts-expect-error TODO: shouldn't the array extensions have this?
      !fragments.isAny('hasDirtyAttributes'),
      'all fragments are in clean state'
    );
    assert.deepEqual(
      fragments.toArray(),
      originalState,
      'original array contents is restored'
    );
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

    assert.strictEqual(
      person.names,
      null,
      'when set to null, fragment array is null'
    );
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

    assert.propContains(person.names!.toArray(), [
      {
        first: 'Catelyn',
        last: 'Tully',
      },
      {
        first: 'Catelyn',
        last: 'Stark',
      },
    ] as unknown as WithFragmentArray<Name>);

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

    assert.strictEqual(
      person.names,
      null,
      'when set to null, fragment array is null'
    );
  });
});
