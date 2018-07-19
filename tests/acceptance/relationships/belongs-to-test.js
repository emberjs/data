import { module } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import Model from 'ember-data/model';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { attr, hasMany, belongsTo } from '@ember-decorators/data';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import Store from 'ember-data/store';
import { resolve, reject } from 'rsvp';
import { ServerError } from 'ember-data/adapters/errors';
import { skipRecordData as test } from '../../helpers/test-in-debug';

class Person extends Model {
  @attr name;
  @hasMany('person', { async: true, inverse: 'parent' })
  children;
  @belongsTo('person', { async: true, inverse: 'children' })
  parent;
}

class TestAdapter extends JSONAPIAdapter {
  setupPayloads(assert, arr) {
    this.assert = assert;
    this._payloads = arr;
  }

  shouldBackgroundReload() {
    return false;
  }

  _nextPayload() {
    let payload = this._payloads.shift();

    if (payload === undefined) {
      this.assert.ok(false, 'Too many adapter requests have been made!');
      return resolve({ data: null });
    }

    if (payload instanceof ServerError) {
      return reject(payload);
    }
    return resolve(payload);
  }

  // find by link
  findHasMany() {
    return this._nextPayload();
  }

  // find by data with coalesceFindRequests set to true
  findMany() {
    return this._nextPayload();
  }

  // find by partial data / individual records
  findRecord() {
    return this._nextPayload();
  }

  deleteRecord() {
    resolve();
  }
}

function makePeopleWithRelationshipData() {
  let people = [
    {
      type: 'person',
      id: '1:no-children-or-parent',
      attributes: { name: 'Chris Has No Children or Parent' },
      relationships: {
        children: { data: [] },
        parent: { data: null },
      },
    },
    {
      type: 'person',
      id: '2:has-1-child-no-parent',
      attributes: {
        name: 'James has one child and no parent',
      },
      relationships: {
        children: {
          data: [{ type: 'person', id: '3:has-2-children-and-parent' }],
        },
        parent: { data: null },
      },
    },
    {
      type: 'person',
      id: '3:has-2-children-and-parent',
      attributes: {
        name: 'Kevin has two children and one parent',
      },
      relationships: {
        children: {
          data: [
            { type: 'person', id: '4:has-parent-no-children' },
            { type: 'person', id: '5:has-parent-no-children' },
          ],
        },
        parent: {
          data: {
            type: 'person',
            id: '2:has-1-child-no-parent',
          },
        },
      },
    },
    {
      type: 'person',
      id: '4:has-parent-no-children',
      attributes: {
        name: 'Selena has a parent',
      },
      relationships: {
        children: {
          data: [],
        },
        parent: {
          data: {
            type: 'person',
            id: '3:has-2-children-and-parent',
          },
        },
      },
    },
    {
      type: 'person',
      id: '5:has-parent-no-children',
      attributes: {
        name: 'Sedona has a parent',
      },
      relationships: {
        children: {
          data: [],
        },
        parent: {
          data: {
            type: 'person',
            id: '3:has-2-children-and-parent',
          },
        },
      },
    },
  ];

  let peopleHash = {};
  people.forEach(person => {
    peopleHash[person.id] = person;
  });

  return {
    dict: peopleHash,
    all: people,
  };
}

module('async belongs-to rendering tests', function(hooks) {
  let store;
  let adapter;
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('model:person', Person);
    owner.register('adapter:application', TestAdapter);
    owner.register('serializer:application', JSONAPISerializer);
    owner.register('service:store', Store);
    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  module('for data-no-link scenarios', function() {
    test('We can render an async belongs-to', async function(assert) {
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [{ data: people.dict['3:has-2-children-and-parent'] }]);

      // render
      this.set('sedona', sedona);

      await render(hbs`
      <p>{{sedona.parent.name}}</p>
      `);

      assert.equal(this.element.textContent.trim(), 'Kevin has two children and one parent');
    });

    // Failing test for https://github.com/emberjs/data/issues/5523
    test('We can delete async belongs-to', async function(assert) {
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [{ data: people.dict['3:has-2-children-and-parent'] }]);

      // render
      this.set('sedona', sedona);
      await render(hbs`
      <p>{{sedona.parent.name}}</p>
      `);

      await sedona
        .belongsTo('parent')
        .value()
        .destroyRecord();
      assert.equal(this.element.textContent.trim(), '');
    });
  });
});
