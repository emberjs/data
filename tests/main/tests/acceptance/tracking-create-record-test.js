import { setComponentTemplate } from '@ember/component';
import * as s from '@ember/service';
import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { module, test } from 'qunit';

import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { memoized } from '@ember-data/store/-private';
import { untracked } from '@ember-data/tracking';

const service = s.service ?? s.inject;

module('acceptance/tracking-transactions', function (hooks) {
  setupRenderingTest(hooks);

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

      @memoized
      get widgets() {
        return untracked(() => {
          const all = this.store.peekAll('widget').filter((r) => r.name === this.args.name);
          const widgetPromise = this.store.query('widget', { name: this.args.name });
          const future = new Future(widgetPromise, all);
          return future;
        });
      }
    }

    const layout = hbs`
      <ul>
        {{#each this.widgets.data as |widget|}}
          <li>{{widget.name}} {{if widget.isValid 'Is Valid' 'Is Invalid'}}</li>
        {{/each}}
      </ul>
    `;

    owner.register('model:widget', Widget);
    owner.register('component:widget-creator', setComponentTemplate(layout, WidgetCreator));
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
