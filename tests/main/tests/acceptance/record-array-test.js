import { computed } from '@ember/object';
import { findAll, render, rerender } from '@ember/test-helpers';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { DEPRECATE_COMPUTED_CHAINS } from '@ember-data/private-build-infra/current-deprecations';

class Person extends Model {
  @attr name;
}

module('IdentifierArray | Classic Chains', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Person);
  });

  test('recomputed with {{#each}}', async function (assert) {
    const store = this.owner.lookup('service:store');

    // populate initial date
    store.push({
      data: [
        { type: 'person', id: '1', attributes: { name: 'Chris' } },
        { type: 'person', id: '2', attributes: { name: 'James' } },
        { type: 'person', id: '3', attributes: { name: 'Thomas' } },
      ],
    });

    class Presenter {
      records = store.peekAll('person');
    }
    const presenter = new Presenter();
    this.set('presenter', presenter);

    await render(hbs`
      <ul>
      {{#each this.presenter.records as |record|}}
        <li>{{record.name}}</li>
      {{/each}}
      </ul>
    `);

    let rendered = findAll('li').map((e) => e.textContent);

    assert.strictEqual(rendered.length, 3, 'we rendered the correct number of names');
    assert.deepEqual(rendered, ['Chris', 'James', 'Thomas'], 'We rendered the names');

    store.createRecord('person', { name: 'Austen' });

    await rerender();

    rendered = findAll('li').map((e) => e.textContent);

    assert.strictEqual(rendered.length, 4, 'we rendered the correct number of names');
    assert.deepEqual(rendered, ['Chris', 'James', 'Thomas', 'Austen'], 'We rendered the names');
  });

  if (DEPRECATE_COMPUTED_CHAINS) {
    test('recomputed with computed.@each', async function (assert) {
      const store = this.owner.lookup('service:store');

      // populate initial date
      store.push({
        data: [
          { type: 'person', id: '1', attributes: { name: 'Chris' } },
          { type: 'person', id: '2', attributes: { name: 'James' } },
          { type: 'person', id: '3', attributes: { name: 'Thomas' } },
        ],
      });

      class Presenter {
        records = store.peekAll('person');

        @computed('records.@each.name')
        get names() {
          return this.records.map((r) => r.name);
        }
      }
      const presenter = new Presenter();
      let { names } = presenter;

      assert.strictEqual(names.length, 3, 'correct names length');
      assert.deepEqual(names, ['Chris', 'James', 'Thomas'], 'correct names in array');

      this.set('presenter', presenter);

      await render(hbs`
        <ul>
        {{#each this.presenter.names as |name|}}
          <li>{{name}}</li>
        {{/each}}
        </ul>
      `);

      let rendered = findAll('li').map((e) => e.textContent);

      assert.strictEqual(rendered.length, 3, 'we rendered the correct number of names');
      assert.deepEqual(rendered, ['Chris', 'James', 'Thomas'], 'We rendered the names');

      store.createRecord('person', { name: 'Austen' });

      names = presenter.names;
      assert.strictEqual(names.length, 4, 'correct names length');
      assert.deepEqual(names, ['Chris', 'James', 'Thomas', 'Austen'], 'correct names in array');

      await rerender();

      rendered = findAll('li').map((e) => e.textContent);

      assert.strictEqual(rendered.length, 4, 'we rendered the correct number of names');
      assert.deepEqual(rendered, ['Chris', 'James', 'Thomas', 'Austen'], 'We rendered the names');
    });

    test('recomputed with computed.[]', async function (assert) {
      const store = this.owner.lookup('service:store');

      // populate initial date
      store.push({
        data: [
          { type: 'person', id: '1', attributes: { name: 'Chris' } },
          { type: 'person', id: '2', attributes: { name: 'James' } },
          { type: 'person', id: '3', attributes: { name: 'Thomas' } },
        ],
      });

      class Presenter {
        records = store.peekAll('person');

        @computed('records.[]')
        get names() {
          return this.records.map((r) => r.name);
        }
      }
      const presenter = new Presenter();
      let { names } = presenter;

      assert.strictEqual(names.length, 3, 'correct names length');
      assert.deepEqual(names, ['Chris', 'James', 'Thomas'], 'correct names in array');

      this.set('presenter', presenter);

      await render(hbs`
        <ul>
        {{#each this.presenter.names as |name|}}
          <li>{{name}}</li>
        {{/each}}
        </ul>
      `);

      let rendered = findAll('li').map((e) => e.textContent);

      assert.strictEqual(rendered.length, 3, 'we rendered the correct number of names');
      assert.deepEqual(rendered, ['Chris', 'James', 'Thomas'], 'We rendered the names');

      store.createRecord('person', { name: 'Austen' });

      names = presenter.names;
      assert.strictEqual(names.length, 4, 'correct names length');
      assert.deepEqual(names, ['Chris', 'James', 'Thomas', 'Austen'], 'correct names in array');

      await rerender();

      rendered = findAll('li').map((e) => e.textContent);

      assert.strictEqual(rendered.length, 4, 'we rendered the correct number of names');
      assert.deepEqual(rendered, ['Chris', 'James', 'Thomas', 'Austen'], 'We rendered the names');
    });

    test('recomputed with computed.length', async function (assert) {
      const store = this.owner.lookup('service:store');

      // populate initial date
      store.push({
        data: [
          { type: 'person', id: '1', attributes: { name: 'Chris' } },
          { type: 'person', id: '2', attributes: { name: 'James' } },
          { type: 'person', id: '3', attributes: { name: 'Thomas' } },
        ],
      });

      class Presenter {
        records = store.peekAll('person');

        @computed('records.length')
        get names() {
          return this.records.map((r) => r.name);
        }
      }
      const presenter = new Presenter();
      let { names } = presenter;

      assert.strictEqual(names.length, 3, 'correct names length');
      assert.deepEqual(names, ['Chris', 'James', 'Thomas'], 'correct names in array');

      this.set('presenter', presenter);

      await render(hbs`
        <ul>
        {{#each this.presenter.names as |name|}}
          <li>{{name}}</li>
        {{/each}}
        </ul>
      `);

      let rendered = findAll('li').map((e) => e.textContent);

      assert.strictEqual(rendered.length, 3, 'we rendered the correct number of names');
      assert.deepEqual(rendered, ['Chris', 'James', 'Thomas'], 'We rendered the names');

      store.createRecord('person', { name: 'Austen' });

      names = presenter.names;
      assert.strictEqual(names.length, 4, 'correct names length');
      assert.deepEqual(names, ['Chris', 'James', 'Thomas', 'Austen'], 'correct names in array');

      await rerender();

      rendered = findAll('li').map((e) => e.textContent);

      assert.strictEqual(rendered.length, 4, 'we rendered the correct number of names');
      assert.deepEqual(rendered, ['Chris', 'James', 'Thomas', 'Austen'], 'We rendered the names');
    });
  }
});
