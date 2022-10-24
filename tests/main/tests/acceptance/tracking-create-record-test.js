import { inject as service } from '@ember/service';
import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import Store from '@ember-data/store';
import { memoTransact, transact, untracked } from '@ember-data/tracking';

module('acceptance/tracking-transactions', function (hooks) {
  setupRenderingTest(hooks);

  test('can read-write peekAll with transact', async function (assert) {
    const { owner } = this;
    class Widget extends Model {
      @attr name;
    }

    class WidgetCreator extends Component {
      @service store;

      @cached
      get widgets() {
        return transact(() => {
          const arr = this.store.peekAll('widget');
          // create a length subscription
          const records = arr.filter((r) => r.isNew);
          if (records.length === 0) {
            // invalidate length
            let record = this.store.createRecord('widget', { name: 'Chris' });
            records.push(record);
          }
          return records;
        });
      }
    }

    let layout = hbs`
      <ul>
        {{#each this.widgets as |widget|}}
          <li>{{widget.name}} {{if widget.isValid 'Is Valid' 'Is Invalid'}}</li>
        {{/each}}
      </ul>
    `;

    owner.register('service:store', Store);
    owner.register('model:widget', Widget);
    owner.register('component:widget-creator', WidgetCreator);
    owner.register('template:components/widget-creator', layout);
    const store = owner.lookup('service:store');

    await render(hbs`
      <WidgetCreator />
    `);
    await settled();

    assert.dom('ul > li').exists({ count: 1 });
    assert.dom('ul > li:nth-of-type(1)').containsText('Chris Is Valid');

    store.createRecord('widget', { name: 'James' });

    await settled();

    assert.dom('ul > li').exists({ count: 2 });
    assert.dom('ul > li:nth-of-type(2)').containsText('James Is Valid');
  });

  test('can read-write peekAll with memoTransact', async function (assert) {
    const { owner } = this;
    class Widget extends Model {
      @attr name;
    }

    class WidgetCreator extends Component {
      @service store;

      getWidgets = memoTransact((name) => {
        const arr = this.store.peekAll('widget');
        // create a length subscription
        const records = arr.filter((r) => r.isNew);
        if (records.length === 0) {
          // invalidate length
          let record = this.store.createRecord('widget', { name });
          records.push(record);
        }
        return records;
      });

      @cached
      get widgets() {
        return this.getWidgets('Chris');
      }
    }

    let layout = hbs`
      <ul>
        {{#each this.widgets as |widget|}}
          <li>{{widget.name}} {{if widget.isValid 'Is Valid' 'Is Invalid'}}</li>
        {{/each}}
      </ul>
    `;

    owner.register('service:store', Store);
    owner.register('model:widget', Widget);
    owner.register('component:widget-creator', WidgetCreator);
    owner.register('template:components/widget-creator', layout);
    const store = owner.lookup('service:store');

    await render(hbs`
      <WidgetCreator />
    `);
    await settled();

    assert.dom('ul > li').exists({ count: 1 });
    assert.dom('ul > li:nth-of-type(1)').containsText('Chris Is Valid');

    // invalidate peekAll length
    store.createRecord('widget', { name: 'James' });
    await settled();

    assert.dom('ul > li').exists({ count: 2 });
    assert.dom('ul > li:nth-of-type(2)').containsText('James Is Valid');
  });

  test('can query safely with untracked', async function (assert) {
    const { owner } = this;
    let id = 1;
    owner.register(
      'adapter:application',
      class {
        query(_, __, query) {
          return Promise.resolve({
            data: [
              {
                type: 'widget',
                id: `${id++}`,
                attributes: {
                  name: query.name,
                },
              },
            ],
          });
        }
        static create() {
          return new this();
        }
      }
    );
    class Widget extends Model {
      @attr name;
    }

    class Future {
      @tracked data = null;
      constructor(promise, content) {
        this.data = content;
        promise.then((r) => (this.data = r));
      }
    }

    class WidgetCreator extends Component {
      @service store;

      @cached
      get widgets() {
        return untracked(() => {
          const all = this.store.peekAll('widget').filter((r) => r.name === this.args.name);
          const widgetPromise = this.store.query('widget', { name: this.args.name });
          const future = new Future(widgetPromise, all);
          return future;
        });
      }
    }

    let layout = hbs`
      <ul>
        {{#each this.widgets.data as |widget|}}
          <li>{{widget.name}} {{if widget.isValid 'Is Valid' 'Is Invalid'}}</li>
        {{/each}}
      </ul>
    `;

    owner.register('service:store', Store);
    owner.register('model:widget', Widget);
    owner.register('component:widget-creator', WidgetCreator);
    owner.register('template:components/widget-creator', layout);
    this.name = 'Chris';

    await render(hbs`
      <WidgetCreator @name={{this.name}} />
    `);
    await settled();

    assert.dom('ul > li').exists({ count: 1 });
    assert.dom('ul > li:nth-of-type(1)').containsText('Chris Is Valid');

    this.set('name', 'James');
    await settled();

    assert.dom('ul > li').exists({ count: 1 });
    assert.dom('ul > li:nth-of-type(1)').containsText('James Is Valid');
  });
});
