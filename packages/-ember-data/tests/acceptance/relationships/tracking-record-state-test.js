import { action } from '@ember/object';
import { inject } from '@ember/service';
import { click, findAll, render } from '@ember/test-helpers';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Store from '@ember-data/store';

class Tag {
  @tracked rev = 0;
}

module('tracking state flags on a record', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
  });

  function resolveAsync(initializer) {
    return function (target, key, desc) {
      const tag = new Tag();
      let _isDirty = true;
      let _isUpdating = false;
      let _value = initializer();
      return {
        enumerable: true,
        configurable: true,
        get() {
          tag.rev; // subscribe
          if (_isDirty && !_isUpdating) {
            _isUpdating = true;
            resolve(desc.get.call(this)).then((v) => {
              _value = v;
              _isDirty = false;
              tag.rev++;
            });
          }
          return _value;
        },
      };
    };
  }

  test('record state on a record in an async has-many notifies as expected', async function (assert) {
    class Person extends Model {
      @attr name;
      @hasMany('person', { async: true, inverse: 'parent' })
      children;
      @belongsTo('person', { async: true, inverse: 'children' })
      parent;
    }
    let childId = 1;
    class ChildrenList extends Component {
      @inject store;
      @tracked newChild = null;

      // an intentionally complicated way of resolving the async proxy
      // to ensure that someone can use things like ember-concurrency
      @resolveAsync(() => null)
      get children() {
        return this.args.model.children;
      }

      get filteredChildren() {
        // we call toArray on the ManyArray to divorce
        // our access of the child and child.isNew.
        // We are now multiple layers deep as we have
        // - resolved the ManyArray from the async proxy
        // - copied the array to a new value
        // - filtered that
        // - access a prop on a single record (which is the prop
        //   we will now change)
        if (this.children !== null) {
          return this.children.slice().filter((child) => {
            return child.isNew;
          });
        } else {
          return [];
        }
      }

      @action
      async saveChild() {
        await this.newChild.save();
        this.newChild = null;
      }

      @action
      createChild() {
        const parent = this.args.model;
        const name = `RGB ${childId++}`;
        this.newChild = this.store.createRecord('person', { name, parent });
      }
    }
    const layout = hbs`
        {{#if this.newChild}}
          <button id="saveChild" {{on "click" this.saveChild}}>Save child</button>
        {{else}}
          <button id="createChild" {{on "click" this.createChild}}>Add child</button>
        {{/if}}

        <h2>New Children</h2>
        <ul id="filtered-children">
            {{#each this.filteredChildren as |child|}}
            <li>{{child.name}} is {{if child.isNew 'young' 'old'}}</li>
            {{/each}}
        </ul>

        <h2>All Children</h2>
        <ul id="all-children">
        {{#each @model.children as |child|}}
            <li>{{child.name}} is {{if child.isNew 'young' 'old'}}</li>
        {{/each}}
        </ul>
        `;
    class Serializer {
      normalizeResponse(_, __, response) {
        return response;
      }
      static create() {
        return new this();
      }
    }
    let serverId = 3;
    class Adapter {
      createRecord() {
        assert.ok(true, 'createRecord was called to save');
        return resolve({ data: { type: 'person', id: `${serverId++}` } });
      }
      static create() {
        return new this();
      }
    }

    this.owner.register('model:person', Person);
    this.owner.register('component:children-list', ChildrenList);
    this.owner.register('template:components/children-list', layout);
    this.owner.register('serializer:application', Serializer);
    this.owner.register('adapter:application', Adapter);
    const store = this.owner.lookup('service:store');
    const person = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: { name: 'Chris' },
        relationships: {
          children: {
            data: [{ type: 'person', id: '2' }],
          },
        },
      },
      included: [
        {
          id: '2',
          type: 'person',
          attributes: { name: 'James' },
          relationships: {
            parent: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      ],
    });

    this.set('model', person);
    await render(hbs`<ChildrenList @model={{this.model}} />`);

    let all = findAll('ul#all-children > li').map((e) => e.textContent);
    let filtered = findAll('ul#filtered-children > li').map((e) => e.textContent);

    assert.deepEqual(all, ['James is old'], 'Initial: We rendered all children correctly.');
    assert.deepEqual(filtered, [], 'Initial: We rendered filtered children correctly.');

    await click('#createChild');

    all = findAll('ul#all-children > li').map((e) => e.textContent);
    filtered = findAll('ul#filtered-children > li').map((e) => e.textContent);

    assert.deepEqual(all, ['James is old', 'RGB 1 is young'], 'After Create: We rendered all children correctly.');
    assert.deepEqual(filtered, ['RGB 1 is young'], 'After Create: We rendered filtered children correctly.');

    await click('#saveChild');

    all = findAll('ul#all-children > li').map((e) => e.textContent);
    filtered = findAll('ul#filtered-children > li').map((e) => e.textContent);

    assert.deepEqual(all, ['James is old', 'RGB 1 is old'], 'After Save: We rendered all children correctly.');
    assert.deepEqual(filtered, [], 'After Save: We rendered filtered children correctly.');

    const children = await person.children;

    assert.deepEqual(
      children.map((c) => c.name),
      ['James', 'RGB 1'],
      'We have the correct children'
    );
    assert.deepEqual(
      children.map((c) => c.isNew),
      [false, false],
      'All children have been saved'
    );
  });
});
