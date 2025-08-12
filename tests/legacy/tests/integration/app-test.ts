import { type TestContext } from '@ember/test-helpers';
import { module, test } from 'qunit';

import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';

import FragmentArrayExtension from '#src/extensions/fragment-array.ts';
import FragmentExtension from '#src/extensions/fragment.ts';
import { withArrayDefaults } from '#src/utilities/with-array-defaults.ts';
import { withFragmentArrayDefaults } from '#src/utilities/with-fragment-array-defaults.ts';
import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';
import { withLegacy } from '#src/utilities/with-legacy.ts';
import { Store } from '../dummy/services/app-store.ts';
import { setupApplicationTest } from '../helpers/index.ts';

interface AppTestContext extends TestContext {
  store: Store;
}

module('Integration | Application', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function (this: AppTestContext) {
    this.owner.register('service:store', Store);
    this.store = this.owner.lookup('service:store') as Store;
  });

  test('Fragment and FragmentArray are setup correctly', function (this: AppTestContext, assert) {
    const PersonSchema = withLegacy({
      type: 'person',
      fields: [
        withFragmentDefaults('name'),
        withFragmentArrayDefaults('addresses'),
        withArrayDefaults('titles'),
      ],
    });

    const NameSchema = {
      type: 'fragment:name',
      identity: null,
      fields: [
        { kind: 'field', name: 'first' },
        { kind: 'field', name: 'last' },
      ],
      objectExtensions: ['ember-object', 'fragment'],
    } satisfies ObjectSchema;

    const AddressSchema = {
      type: 'fragment:address',
      identity: null,
      fields: [
        { kind: 'field', name: 'street' },
        { kind: 'field', name: 'city' },
        { kind: 'field', name: 'region' },
        { kind: 'field', name: 'country' },
      ],
    } satisfies ObjectSchema;

    this.store.schema.registerResources([
      PersonSchema,
      NameSchema,
      AddressSchema,
    ]);

    assert.ok(
      this.store.schema.hasResource(PersonSchema),
      'PersonSchema is registered'
    );
    assert.ok(
      this.store.schema.hasResource(NameSchema),
      'NameSchema is registered'
    );
    assert.ok(
      this.store.schema.hasResource(AddressSchema),
      'AddressSchema is registered'
    );
  });

  test('the fragment and fragment-array extenions are registered', function (this: AppTestContext, assert) {
    assert.ok(
      this.store.schema.CAUTION_MEGA_DANGER_ZONE_hasExtension(FragmentExtension)
    );
    assert.ok(
      this.store.schema.CAUTION_MEGA_DANGER_ZONE_hasExtension(
        FragmentArrayExtension
      )
    );
  });
});
