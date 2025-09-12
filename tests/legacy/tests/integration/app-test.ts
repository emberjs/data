import type { TestContext } from '@ember/test-helpers';

import type { ObjectSchema } from '@warp-drive/core-types/schema/fields';
import { module, setupRenderingTest, test } from '@warp-drive/diagnostic/ember';
import {
  FragmentArrayExtension,
  FragmentExtension,
  registerFragmentExtensions,
  withArrayDefaults,
  withFragmentArrayDefaults,
  withFragmentDefaults,
  withLegacy,
} from '@warp-drive/legacy/model-fragments';

import { Store } from '../-test-store/store.ts';

interface AppTestContext extends TestContext {
  store: Store;
}

module('Integration | Application', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: AppTestContext) {
    this.owner.register('service:store', Store);
    this.store = this.owner.lookup('service:store') as Store;
    registerFragmentExtensions(this.store);
  });

  test('Fragment and FragmentArray are setup correctly', function (this: AppTestContext, assert) {
    const PersonSchema = withLegacy({
      type: 'person',
      fields: [withFragmentDefaults('name'), withFragmentArrayDefaults('addresses'), withArrayDefaults('titles')],
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

    this.store.schema.registerResources([PersonSchema, NameSchema, AddressSchema]);

    assert.ok(this.store.schema.hasResource(PersonSchema), 'PersonSchema is registered');
    assert.ok(this.store.schema.hasResource(NameSchema), 'NameSchema is registered');
    assert.ok(this.store.schema.hasResource(AddressSchema), 'AddressSchema is registered');
  });

  test('the fragment and fragment-array extenions are registered', function (this: AppTestContext, assert) {
    assert.ok(this.store.schema.CAUTION_MEGA_DANGER_ZONE_hasExtension(FragmentExtension));
    assert.ok(this.store.schema.CAUTION_MEGA_DANGER_ZONE_hasExtension(FragmentArrayExtension));
  });
});
