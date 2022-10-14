import { inject as service } from '@ember/service';
import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import Store from '@ember-data/store';

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
      get widget() {
        return this.store.createRecord('widget', { name: 'Chris' });
      }
    }

    let layout = hbs`
      <h1>{{this.widget.name}}</h1>
      <h2>Valid: {{if this.widget.isValid 'Yes' 'No'}}</h2>
    `;

    owner.register('service:store', Store);
    owner.register('model:widget', Widget);
    owner.register('component:widget-creator', WidgetCreator);
    owner.register('template:components/widget-creator', layout);

    await render(hbs`
      <WidgetCreator />
    `);
    await settled();

    assert.dom('h1').exists();
    assert.dom('h1').containsText('Chris');
    assert.dom('h2').containsText('Yes');
  });
});
