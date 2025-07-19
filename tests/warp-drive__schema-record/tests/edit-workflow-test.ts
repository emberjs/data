import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { serializePatch, serializeResources, updateRecord } from '@ember-data/json-api/request';
import RequestManager from '@ember-data/request';
import { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import { checkout, commit } from '@warp-drive/core/reactive';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

import type Store from '../app/services/store';

const UserSchema = withDefaults({
  type: 'user',
  fields: [
    {
      name: 'name',
      kind: 'field',
    },
  ],
});
type User = Readonly<{
  id: string;
  name: string;
  $type: 'user';
  [Type]: 'user';
}>;

type EditableUser = {
  readonly id: string;
  name: string;
  readonly $type: 'user';
  readonly [Type]: 'user';
};

module('WarpDrive | ReactiveResource | Edit Workflow', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    store.schema.registerResource(UserSchema);
    registerDerivations(store.schema);
    store.requestManager = new RequestManager()
      .use([
        {
          request({ request }) {
            const { url, method, body } = request;
            assert.step(`${method} ${url}`);
            return Promise.resolve(JSON.parse(body as string));
          },
        },
      ])
      .useCache(CacheHandler);
  });

  test('we can edit a record', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.push<User>({
      data: {
        id: '1',
        type: 'user',
        attributes: { name: 'Rey Skybarker' },
      },
    });
    const editableUser = await checkout<EditableUser>(user);
    assert.strictEqual(editableUser.name, 'Rey Skybarker', 'name is accessible');
    editableUser.name = 'Rey Skywalker';
    assert.strictEqual(editableUser.name, 'Rey Skywalker', 'name is updated');
    assert.strictEqual(user.name, 'Rey Skybarker', 'immutable record shows original value');

    // ensure identifier works as expected
    const identifier = recordIdentifierFor(editableUser);
    assert.strictEqual(identifier.id, '1', 'id is accessible');
    assert.strictEqual(identifier.type, 'user', 'type is accessible');

    // ensure save works as expected
    const saveInit = updateRecord(editableUser);
    const patch = serializePatch(store.cache, recordIdentifierFor(editableUser));
    saveInit.body = JSON.stringify(patch);

    const saveResult = await store.request(saveInit);
    assert.deepEqual(saveResult.content.data, user, 'we get the immutable version back from the request');
    assert.verifySteps(['PUT /users/1']);
    assert.strictEqual(user.name, 'Rey Skywalker', 'name is updated in the cache and shows in the immutable record');
  });

  test('we can serialize an editable record', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.push<User>({
      data: {
        id: '1',
        type: 'user',
        attributes: { name: 'Rey Skybarker' },
      },
    });
    const editableUser = await checkout<EditableUser>(user);
    assert.strictEqual(editableUser.name, 'Rey Skybarker', 'name is accessible');
    editableUser.name = 'Rey Skywalker';
    assert.strictEqual(editableUser.name, 'Rey Skywalker', 'name is updated');
    assert.strictEqual(user.name, 'Rey Skybarker', 'immutable record shows original value');

    // ensure identifier works as expected
    const identifier = recordIdentifierFor(editableUser);
    assert.strictEqual(identifier.id, '1', 'id is accessible');
    assert.strictEqual(identifier.type, 'user', 'type is accessible');

    // ensure save works as expected
    const saveInit = updateRecord(editableUser);
    const body = serializeResources(store.cache, saveInit.data.record);
    saveInit.body = JSON.stringify(body);

    const saveResult = await store.request(saveInit);
    assert.deepEqual(saveResult.content.data, user, 'we get the immutable version back from the request');
    assert.verifySteps(['PUT /users/1']);
    assert.strictEqual(user.name, 'Rey Skywalker', 'name is updated in the cache and shows in the immutable record');
  });

  test('serializing the immutable record serializes the edits', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.push<User>({
      data: {
        id: '1',
        type: 'user',
        attributes: { name: 'Rey Skybarker' },
      },
    });
    const editableUser = await checkout<EditableUser>(user);
    assert.strictEqual(editableUser.name, 'Rey Skybarker', 'name is accessible');
    editableUser.name = 'Rey Skywalker';
    assert.strictEqual(editableUser.name, 'Rey Skywalker', 'name is updated');
    assert.strictEqual(user.name, 'Rey Skybarker', 'immutable record shows original value');

    // ensure identifier works as expected
    const identifier = recordIdentifierFor(editableUser);
    assert.strictEqual(identifier.id, '1', 'id is accessible');
    assert.strictEqual(identifier.type, 'user', 'type is accessible');

    // ensure save works as expected
    const saveInit = updateRecord(user);
    const body = serializeResources(store.cache, saveInit.data.record);
    saveInit.body = JSON.stringify(body);

    const saveResult = await store.request(saveInit);
    assert.deepEqual(saveResult.content.data, user, 'we get the immutable version back from the request');
    assert.verifySteps(['PUT /users/1']);
    assert.strictEqual(user.name, 'Rey Skywalker', 'name is updated in the cache and shows in the immutable record');
  });

  test('we can commit an editable record', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.push<User>({
      data: {
        id: '1',
        type: 'user',
        attributes: { name: 'Rey Skybarker' },
      },
    });
    const editableUser = await checkout<EditableUser>(user);
    assert.strictEqual(editableUser.name, 'Rey Skybarker', 'name is accessible');
    editableUser.name = 'Rey Skywalker';
    assert.strictEqual(editableUser.name, 'Rey Skywalker', 'name is updated');
    assert.strictEqual(user.name, 'Rey Skybarker', 'immutable record shows original value');

    // ensure identifier works as expected
    const identifier = recordIdentifierFor(editableUser);
    assert.strictEqual(identifier.id, '1', 'id is accessible');
    assert.strictEqual(identifier.type, 'user', 'type is accessible');

    // ensure commit works as expected
    await commit(editableUser);
    assert.strictEqual(user.name, 'Rey Skywalker', 'name is updated in the cache and shows in the immutable record');
  });
});
