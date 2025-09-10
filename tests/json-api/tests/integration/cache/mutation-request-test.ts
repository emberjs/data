import type { Store } from '@warp-drive/core';
import { recordIdentifierFor, useRecommendedStore } from '@warp-drive/core';
import { withDefaults } from '@warp-drive/core/reactive';
import { withReactiveResponse } from '@warp-drive/core/request';
import type { Type } from '@warp-drive/core/types/symbols';
import { module, test, todo } from '@warp-drive/diagnostic';
import type { TestContext } from '@warp-drive/diagnostic/-types';
import { MockServerHandler } from '@warp-drive/holodeck';
import { POST } from '@warp-drive/holodeck/mock';
import { JSONAPICache } from '@warp-drive/json-api';
import { buildBaseURL } from '@warp-drive/utilities';

interface NewUser {
  [Type]: 'user';
  id: null;
  firstName?: string;
  lastName?: string;
}

interface ExistingUser {
  [Type]: 'user';
  id: string;
  firstName: string;
  lastName: string;
}

interface CustomContext extends TestContext {
  store: Store;
}

module<CustomContext>('mutation-request', function (hooks) {
  hooks.beforeEach(function () {
    const TestStore = useRecommendedStore({
      handlers: [new MockServerHandler(this)],
      cache: JSONAPICache,
      schemas: [
        withDefaults({
          type: 'user',
          fields: [
            { name: 'firstName', kind: 'field' },
            { name: 'lastName', kind: 'field' },
          ],
        }),
      ],
    });
    this.store = new TestStore();
  });

  test<CustomContext>('bulk create', async function (assert) {
    const { store } = this;
    const reqBody = JSON.stringify({
      data: [
        { type: 'user', attributes: { firstName: 'Chris' } },
        { type: 'user', attributes: { firstName: 'Tom' } },
      ],
    });
    await POST(
      this,
      '/api/user/ops/bulk.create',
      () => {
        return {
          data: [
            { type: 'user', id: 'id1', attributes: { firstName: 'Chris' } },
            { type: 'user', id: 'id2', attributes: { firstName: 'Tom' } },
          ],
        };
      },
      {
        body: reqBody,
      }
    );

    const user1 = store.createRecord<NewUser>('user', { firstName: 'Chris' });
    const lid1 = recordIdentifierFor(user1);
    const user2 = store.createRecord<NewUser>('user', { firstName: 'Tom' });
    const lid2 = recordIdentifierFor(user2);

    const url = buildBaseURL({ resourcePath: 'api/user/ops/bulk.create' });
    const records = await this.store.request(
      withReactiveResponse<ExistingUser[]>({
        op: 'createRecord',
        url,
        method: 'POST',
        body: reqBody,
        records: [lid1, lid2],
      })
    );

    const record1 = store.peekRecord<ExistingUser>(lid1);
    const record2 = store.peekRecord<ExistingUser>(lid2);

    assert.equal(records.content?.data?.length, 2, 'two records are created');
    const [created1, created2] = records.content?.data || [];
    assert.equal(record1, created1, 'first record is returned');
    assert.equal(record2, created2, 'second record is returned');
    assert.equal(record1?.firstName, 'Chris', 'first record has correct firstName');
    assert.equal(record2?.firstName, 'Tom', 'second record has correct firstName');
    assert.equal(record1?.id, 'id1', 'first record has correct id');
    assert.equal(record2?.id, 'id2', 'second record has correct id');

    // @ts-expect-error we need to fix type here
    assert.notEqual(record1, user1, 'first record is not the same as user1');
    // @ts-expect-error we need to fix type here
    assert.notEqual(record2, user2, 'second record is not the same as user2');

    // make sure the created ones updated
    assert.equal(user1?.id, 'id1', 'first record has correct id');
    assert.equal(user2?.id, 'id2', 'second record has correct id');
  });

  todo('bulk delete', function (assert) {});
  todo('bulk update with 204 response', function (assert) {});
  todo('bulk-delete with 204 response', function (assert) {});
  todo('update with 204 response', function (assert) {});
  todo('delete with 204 response', function (assert) {});
});
