import { module } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import Model from 'ember-data/model';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { attr, hasMany, belongsTo } from '@ember-decorators/data';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import Store from 'ember-data/store';
import { resolve, reject } from 'rsvp';
import { ServerError } from 'ember-data/adapters/errors';
import { skipRecordData as test } from '../../helpers/test-in-debug';
import Ember from 'ember';

class Person extends Model {
  @attr
  name;
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

  shouldBackgroundReloadRecord() {
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
    return resolve({ data: null });
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
    owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, jsonApi) {
          return jsonApi;
        },
      })
    );
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

    test('We can delete an async belongs-to', async function(assert) {
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

      let parent = await sedona.get('parent');
      await parent.destroyRecord();

      let newParent = await sedona.get('parent');

      await settled();

      assert.ok(newParent === null, 'We no longer have a parent');
      assert.equal(
        this.element.textContent.trim(),
        '',
        "We no longer render our parent's name because we no longer have a parent"
      );
    });

    test('Re-rendering an async belongsTo does not cause a new fetch', async function(assert) {
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

      this.set('sedona', null);
      assert.equal(this.element.textContent.trim(), '');

      this.set('sedona', sedona);
      assert.equal(this.element.textContent.trim(), 'Kevin has two children and one parent');
    });

    test('Rendering an async belongs-to whose fetch fails does not trigger a new request', async function(assert) {
      assert.expect(15);
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [
        new ServerError([], 'hard error while finding <person>5:has-parent-no-children'),
      ]);

      // render
      this.set('sedona', sedona);

      let originalOnError = Ember.onerror;
      Ember.onerror = function(e) {
        assert.ok(true, 'Children promise did reject');
        assert.equal(
          e.message,
          'hard error while finding <person>5:has-parent-no-children',
          'Rejection has the correct message'
        );
      };

      // needed for LTS 2.12 and 2.16
      Ember.Test.adapter.exception = e => {
        assert.ok(true, 'Children promise did reject');
        assert.equal(
          e.message,
          'hard error while finding <person>5:has-parent-no-children',
          'Rejection has the correct message'
        );
      };

      await render(hbs`
      <p>{{sedona.parent.name}}</p>
      `);

      assert.equal(this.element.textContent.trim(), '', 'we have no parent');

      let relationshipState = sedona.belongsTo('parent').belongsToRelationship;

      assert.equal(relationshipState.isAsync, true, 'The relationship is async');
      assert.equal(relationshipState.relationshipIsEmpty, false, 'The relationship is not empty');
      assert.equal(relationshipState.relationshipIsStale, true, 'The relationship is still stale');
      assert.equal(
        relationshipState.allInverseRecordsAreLoaded,
        false,
        'The relationship is missing some or all related resources'
      );
      assert.equal(
        relationshipState.hasAnyRelationshipData,
        true,
        'The relationship knows which record it needs'
      );
      assert.equal(
        relationshipState.fetchPromise === null,
        true,
        'The relationship has no fetchPromise'
      );
      assert.equal(
        relationshipState.hasFailedLoadAttempt === true,
        true,
        'The relationship has attempted a load'
      );
      assert.equal(
        relationshipState.shouldForceReload === false,
        true,
        'The relationship will not force a reload'
      );
      assert.equal(
        relationshipState._promiseProxy !== null,
        true,
        'The relationship has a loadingPromise'
      );
      assert.equal(!!relationshipState.link, false, 'The relationship does not have a link');
      assert.equal(
        relationshipState.shouldMakeRequest(),
        false,
        'The relationship does not need to make a request'
      );
      let result = await sedona.get('parent');
      assert.ok(result === null, 're-access is safe');

      Ember.onerror = originalOnError;
    });
  });
});
