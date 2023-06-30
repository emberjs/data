import { render, setupOnerror } from '@ember/test-helpers';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupRenderingTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('DX | Meaningful Backtracking Errors', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );
  });

  test('We meaningfully error for live arrays', async function (assert) {
    assert.expect(1);
    const store = this.owner.lookup('service:store');

    class PoorlyWrittenCode {
      get value() {
        return store.createRecord('user', { name: 'Chris' });
      }
    }

    this.set('records', store.peekAll('user'));
    this.set('badCode', new PoorlyWrittenCode());

    function handler(error) {
      assert.strictEqual(error.message, '', 'we have a meaningful error');
      return false;
    }

    // setupOnerror(handler);

    await render(hbs`
      Count: {{this.records.length}}
      Value: {{this.badCode.value}}
    `);

    // setupOnerror();
  });
});
