import { inject as service } from '@ember/service';
import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import Store from '@ember-data/store';
import { transact } from '@ember-data/tracking';

module('acceptance/tracking-create-record', function (hooks) {
  setupRenderingTest(hooks);

  test('can track attrs and state on a record', async function (assert) {
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

    await render(hbs`
      <WidgetCreator />
    `);
    await settled();

    assert.dom('ul > li').exists({ count: 1 });
    assert.dom('ul > li:nth-of-type(1)').containsText('Chris Is Valid');
  });
});
