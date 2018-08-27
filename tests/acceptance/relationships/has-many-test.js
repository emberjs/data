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
import Ember from 'ember';
import { skipRecordData as test } from '../../helpers/test-in-debug';

function domListToArray(domList) {
  return Array.prototype.slice.call(domList);
}

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

function makePeopleWithRelationshipLinks(removeData = true) {
  let people = makePeopleWithRelationshipData();
  let linkPayloads = (people.links = {});

  people.all.map(person => {
    Object.keys(person.relationships).forEach(relName => {
      let rel = person.relationships[relName];
      let data = rel.data;

      if (removeData === true) {
        delete rel.data;
      }

      if (Array.isArray(data)) {
        data = data.map(ref => people.dict[ref.id]);
      } else {
        if (data !== null) {
          data = people.dict[data.id];
        }
      }

      rel.links = {
        related: `./${person.type}/${person.id}/${relName}`,
      };
      linkPayloads[rel.links.related] = {
        data,
      };
    });
  });

  return people;
}

module('async has-many rendering tests', function(hooks) {
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
    test('We can render an async hasMany', async function(assert) {
      let people = makePeopleWithRelationshipData();
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        { data: people.dict['4:has-parent-no-children'] },
        { data: people.dict['5:has-parent-no-children'] },
      ]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );
    });

    test('Re-rendering an async hasMany does not cause a new fetch', async function(assert) {
      let people = makePeopleWithRelationshipData();
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        { data: people.dict['4:has-parent-no-children'] },
        { data: people.dict['5:has-parent-no-children'] },
      ]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );

      this.set('parent', null);

      items = this.element.querySelectorAll('li');
      assert.ok(items.length === 0, 'We have no items');

      this.set('parent', parent);

      items = this.element.querySelectorAll('li');
      names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );
    });

    test('Rendering an async hasMany whose fetch fails does not trigger a new request', async function(assert) {
      assert.expect(12);
      let people = makePeopleWithRelationshipData();
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        { data: people.dict['4:has-parent-no-children'] },
        new ServerError([], 'hard error while finding <person>5:has-parent-no-children'),
      ]);

      // render
      this.set('parent', parent);

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
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent'],
        'We rendered only the names for successful requests'
      );

      let relationshipState = parent.hasMany('children').hasManyRelationship;

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
        relationshipState._promiseProxy !== null,
        true,
        'The relationship has a loadingPromise'
      );
      assert.equal(!!relationshipState.link, false, 'The relationship does not have a link');

      Ember.onerror = originalOnError;
    });
  });

  module('for link-no-data scenarios', function() {
    test('We can render an async hasMany with a link', async function(assert) {
      let people = makePeopleWithRelationshipLinks(true);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        people.links['./person/3:has-2-children-and-parent/children'],
      ]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );
    });

    test('Re-rendering an async hasMany with a link does not cause a new fetch', async function(assert) {
      let people = makePeopleWithRelationshipLinks(true);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        people.links['./person/3:has-2-children-and-parent/children'],
      ]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );

      this.set('parent', null);

      items = this.element.querySelectorAll('li');
      assert.ok(items.length === 0, 'We have no items');

      this.set('parent', parent);

      items = this.element.querySelectorAll('li');
      names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );
    });

    test('Rendering an async hasMany with a link whose fetch fails does not trigger a new request', async function(assert) {
      assert.expect(12);
      let people = makePeopleWithRelationshipLinks(true);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        people.links['./person/3:has-2-children-and-parent/children'],
      ]);

      adapter.setupPayloads(assert, [
        new ServerError(
          [],
          'hard error while finding link ./person/3:has-2-children-and-parent/children'
        ),
      ]);

      // render
      this.set('parent', parent);

      let originalOnError = Ember.onerror;
      Ember.onerror = function(e) {
        assert.ok(true, 'Children promise did reject');
        assert.equal(
          e.message,
          'hard error while finding link ./person/3:has-2-children-and-parent/children',
          'Rejection has the correct message'
        );
      };

      // needed for LTS 2.12 and 2.16
      Ember.Test.adapter.exception = e => {
        assert.ok(true, 'Children promise did reject');
        assert.equal(
          e.message,
          'hard error while finding link ./person/3:has-2-children-and-parent/children',
          'Rejection has the correct message'
        );
      };

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(names, [], 'We rendered no names');

      let relationshipState = parent.hasMany('children').hasManyRelationship;

      assert.equal(relationshipState.isAsync, true, 'The relationship is async');
      assert.equal(
        relationshipState.relationshipIsEmpty,
        true,
        'The relationship is empty because no signal has been received as to true state'
      );
      assert.equal(relationshipState.relationshipIsStale, true, 'The relationship is still stale');
      assert.equal(
        relationshipState.allInverseRecordsAreLoaded,
        true,
        'The relationship is missing some or all related resources'
      );
      assert.equal(
        relationshipState.hasAnyRelationshipData,
        false,
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
        relationshipState._promiseProxy !== null,
        true,
        'The relationship has a loadingPromise'
      );
      assert.equal(!!relationshipState.link, true, 'The relationship has a link');

      Ember.onerror = originalOnError;
    });
  });

  module('for link-and-data scenarios', function() {
    test('We can render an async hasMany with a link and data', async function(assert) {
      let people = makePeopleWithRelationshipLinks(false);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        people.links['./person/3:has-2-children-and-parent/children'],
      ]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );
    });

    test('Rendering an async hasMany with a link and data where data has been side-loaded does not fetch the link', async function(assert) {
      let people = makePeopleWithRelationshipLinks(false);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
        included: [
          people.dict['4:has-parent-no-children'],
          people.dict['5:has-parent-no-children'],
        ],
      });

      // no requests should be made
      adapter.setupPayloads(assert, []);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );
    });

    test('Re-rendering an async hasMany with a link and data does not cause a new fetch', async function(assert) {
      let people = makePeopleWithRelationshipLinks(false);
      let parent = store.push({
        data: people.dict['3:has-2-children-and-parent'],
      });

      adapter.setupPayloads(assert, [
        people.links['./person/3:has-2-children-and-parent/children'],
      ]);

      // render
      this.set('parent', parent);

      await render(hbs`
      <ul>
      {{#each parent.children as |child|}}
        <li>{{child.name}}</li>
      {{/each}}
      </ul>
    `);

      let items = this.element.querySelectorAll('li');
      let names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );

      this.set('parent', null);

      items = this.element.querySelectorAll('li');
      assert.ok(items.length === 0, 'We have no items');

      this.set('parent', parent);

      items = this.element.querySelectorAll('li');
      names = domListToArray(items).map(e => e.textContent);

      assert.deepEqual(
        names,
        ['Selena has a parent', 'Sedona has a parent'],
        'We rendered the names'
      );
    });
  });
});
