import { module, test } from 'qunit';
import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('it works', function (hooks) {
  setupApplicationTest(hooks);

  test('we can boot the app', async function (assert) {
    await visit('/');
    assert.ok('it works!');
  });

  test('we can use the store', async function (assert) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore this repo loads the declarations for qunit in the wrong order
    const { owner } = this;
    const store = owner.lookup('service:store');

    const record = store.createRecord('user', { name: 'Chris' });

    assert.strictEqual(record.name, 'Chris', 'correct name');
  });
});
