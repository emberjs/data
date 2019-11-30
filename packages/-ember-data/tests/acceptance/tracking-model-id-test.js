import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import Store from '@ember-data/store';
import Model, { attr } from '@ember-data/model';
import Component from '@glimmer/component';
import { dependentKeyCompat } from '@ember/object/compat';
import { gte } from 'ember-compatibility-helpers';
import { has } from 'require';

class Widget extends Model {
  @attr() name;

  @dependentKeyCompat
  get numericId() {
    return Number(this.id);
  }
}

class WidgetList extends Component {
  get sortedWidgets() {
    let { widgets } = this.args;

    return widgets.slice().sort((a, b) => b.numericId - a.numericId);
  }
}

let layout = hbs`
  <ul>
    {{#each this.sortedWidgets as |widget index|}}
      <li class="widget{{index}}">
        <div class="id">ID: {{widget.id}}</div>
        <div class="numeric-id">Numeric ID: {{widget.numericId}}</div>
        <div class="name">Name: {{widget.name}}</div>
        <br/>
      </li>
    {{/each}}
  </ul>
`;

if (gte('3.14.0') && has('@glimmer/component')) {
  module('acceptance/tracking-model-id - tracking model id', function(hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function() {
      let { owner } = this;
      owner.register('service:store', Store);
      owner.register('model:widget', Widget);
      owner.register('component:widget-list', WidgetList);
      owner.register('template:components/widget-list', layout);
    });

    test("can track model id's without using get", async function(assert) {
      let store = this.owner.lookup('service:store');
      store.createRecord('widget', { id: '1', name: 'Doodad' });
      store.createRecord('widget', { id: '4', name: 'Gizmo' });
      store.createRecord('widget', { id: '3', name: 'Gadget' });
      store.createRecord('widget', { id: '2', name: 'Contraption' });
      this.widgets = store.peekAll('widget');

      await render(hbs`
        <WidgetList @widgets={{this.widgets}} />
      `);
      await settled();

      assert.dom('ul>li+li+li+li').exists;
      assert.dom('ul>li.widget1>div.name').containsText('Doodad');
      assert.dom('ul>li.widget2>div.name').containsText('Contraption');
      assert.dom('ul>li.widget3>div.name').containsText('Gadget');
      assert.dom('ul>li.widget4>div.name').containsText('Gizmo');
    });
  });
}
