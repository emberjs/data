import { render, settled } from '@ember/test-helpers';

import hbs from 'htmlbars-inline-precompile';
import { module } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import Store from '@ember-data/store';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

class Widget extends Model {
  @attr name;
}

module('acceptance/tracking-promise-flags', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:widget', Widget);
    owner.register(
      'serializer:application',
      class {
        normalizeResponse = (_, __, data) => data;
        static create() {
          return new this();
        }
      }
    );
  });

  deprecatedTest(
    'can track isPending',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0', count: 6 },
    async function (assert) {
      const { owner } = this;
      let resolve;
      class TestAdapter extends JSONAPIAdapter {
        findRecord() {
          return new Promise((r) => {
            resolve = r;
          });
        }
      }
      owner.register('adapter:application', TestAdapter);
      let store = owner.lookup('service:store');
      store.DISABLE_WAITER = true;
      this.model = store.findRecord('widget', '1');

      await render(hbs`{{#if this.model.isPending}}Pending{{else}}{{this.model.name}}{{/if}}`);

      assert.dom().containsText('Pending');

      resolve({
        data: {
          id: '1',
          type: 'widget',
          attributes: {
            name: 'Contraption',
          },
        },
      });
      await settled();

      assert.dom().containsText('Contraption');
    }
  );
});
