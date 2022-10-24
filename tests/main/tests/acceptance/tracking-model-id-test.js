import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupRenderingTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';

class Widget extends Model {
  @attr() name;

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

class TestAdapter extends JSONAPIAdapter {
  createRecord() {
    return resolve({
      data: {
        id: '4',
        type: 'widget',
        attributes: {
          name: 'Contraption',
        },
      },
    });
  }
}

module('acceptance/tracking-model-id - tracking model id', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:widget', Widget);
    owner.register('component:widget-list', WidgetList);
    owner.register('template:components/widget-list', layout);
    owner.register('adapter:application', TestAdapter);
    owner.register('serializer:application', JSONAPISerializer);
  });

  test("can track model id's without using get", async function (assert) {
    let store = this.owner.lookup('service:store');
    store.createRecord('widget', { id: '1', name: 'Doodad' });
    store.createRecord('widget', { id: '3', name: 'Gizmo' });
    store.createRecord('widget', { id: '2', name: 'Gadget' });
    this.widgets = store.peekAll('widget');

    await render(hbs`
      <WidgetList @widgets={{this.widgets}} />
    `);
    await settled();

    assert.dom('ul>li+li+li').exists();
    assert.dom('ul>li.widget0>div.name').containsText('Gizmo');
    assert.dom('ul>li.widget1>div.name').containsText('Gadget');
    assert.dom('ul>li.widget2>div.name').containsText('Doodad');

    let contraption = store.createRecord('widget', { name: 'Contraption' });
    await contraption.save();
    await settled();

    assert.dom('ul>li+li+li+li').exists();
    assert.dom('ul>li.widget0>div.name').containsText('Contraption');
    assert.dom('ul>li.widget1>div.name').containsText('Gizmo');
    assert.dom('ul>li.widget2>div.name').containsText('Gadget');
    assert.dom('ul>li.widget3>div.name').containsText('Doodad');
  });
});
