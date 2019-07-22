import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model from '@ember-data/model';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import { Promise, resolve, reject } from 'rsvp';
import { ServerError } from '@ember-data/adapter/error';
import Ember from 'ember';
import { attr, hasMany, belongsTo } from '@ember-data/model';

class Person extends Model {
  @attr()
  name;
  @hasMany('person', { async: true, inverse: 'parent' })
  children;
  @belongsTo('person', { async: true, inverse: 'children' })
  parent;
  @belongsTo('pet', { inverse: 'bestHuman', async: true })
  bestDog;
}

class Pet extends Model {
  @belongsTo('person', { inverse: 'bestDog', async: false })
  bestHuman;
  @attr()
  name;
}

class TestAdapter extends JSONAPIAdapter {
  setupPayloads(assert, arr) {
    this.assert = assert;
    this._payloads = arr;
  }

  shouldBackgroundReloadRecord() {
    return false;
  }

  pause() {
    this.isPaused = true;
    this.pausePromise = new Promise(resolve => {
      this._resume = resolve;
    });
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this._resume();
    }
  }

  _nextPayload() {
    if (this.isPaused) {
      return this.pausePromise.then(() => this._nextPayload());
    }

    let payload = this._payloads.shift();

    if (payload === undefined) {
      this.assert.ok(false, 'Too many adapter requests have been made!');
      return reject(new ServerError([], 'Too many adapter requests have been made!'));
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
    owner.register('model:pet', Pet);
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

  module('for local changes', function(hooks) {
    hooks.beforeEach(function() {
      let { owner } = this;
      owner.register('model:person', Person);
      owner.register('model:pet', Pet);
    });

    test('async belongsTo returns correct new value after a local change', async function(assert) {
      let chris = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: { name: 'Chris' },
          relationships: {
            bestDog: {
              data: null,
            },
          },
        },
        included: [
          {
            type: 'pet',
            id: '1',
            attributes: { name: 'Shen' },
            relationships: {
              bestHuman: {
                data: null,
              },
            },
          },
          {
            type: 'pet',
            id: '2',
            attributes: { name: 'Pirate' },
            relationships: {
              bestHuman: {
                data: null,
              },
            },
          },
        ],
      });

      let shen = store.peekRecord('pet', '1');
      let pirate = store.peekRecord('pet', '2');
      let bestDog = await chris.get('bestDog');

      this.set('chris', chris);

      await render(hbs`
      <p>{{chris.bestDog.name}}</p>
      `);
      await settled();

      assert.equal(this.element.textContent.trim(), '');
      assert.ok(shen.get('bestHuman') === null, 'precond - Shen has no best human');
      assert.ok(pirate.get('bestHuman') === null, 'precond - pirate has no best human');
      assert.ok(bestDog === null, 'precond - Chris has no best dog');

      chris.set('bestDog', shen);
      bestDog = await chris.get('bestDog');
      await settled();

      assert.equal(this.element.textContent.trim(), 'Shen');
      assert.ok(shen.get('bestHuman') === chris, "scene 1 - Chris is Shen's best human");
      assert.ok(pirate.get('bestHuman') === null, 'scene 1 - pirate has no best human');
      assert.ok(bestDog === shen, "scene 1 - Shen is Chris's best dog");

      chris.set('bestDog', pirate);
      bestDog = await chris.get('bestDog');
      await settled();

      assert.equal(this.element.textContent.trim(), 'Pirate');
      assert.ok(shen.get('bestHuman') === null, "scene 2 - Chris is no longer Shen's best human");
      assert.ok(pirate.get('bestHuman') === chris, 'scene 2 - pirate now has Chris as best human');
      assert.ok(bestDog === pirate, "scene 2 - Pirate is now Chris's best dog");

      chris.set('bestDog', null);
      bestDog = await chris.get('bestDog');
      await settled();

      assert.equal(this.element.textContent.trim(), '');
      assert.ok(shen.get('bestHuman') === null, "scene 3 - Chris remains no longer Shen's best human");
      assert.ok(pirate.get('bestHuman') === null, 'scene 3 - pirate no longer has Chris as best human');
      assert.ok(bestDog === null, 'scene 3 - Chris has no best dog');
    });
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
      assert.expect(14);
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [new ServerError([], 'hard error while finding <person>5:has-parent-no-children')]);

      // render
      this.set('sedona', sedona);

      let originalOnError = Ember.onerror;
      let hasFired = false;
      Ember.onerror = function(e) {
        if (!hasFired) {
          hasFired = true;
          assert.ok(true, 'Children promise did reject');
          assert.equal(
            e.message,
            'hard error while finding <person>5:has-parent-no-children',
            'Rejection has the correct message'
          );
        } else {
          assert.ok(false, 'We only reject a single time');
          adapter.pause(); // prevent further recursive calls to load the relationship
        }
      };

      await render(hbs`
      <p>{{sedona.parent.name}}</p>
      `);

      assert.equal(this.element.textContent.trim(), '', 'we have no parent');

      let relationshipState = sedona.belongsTo('parent').belongsToRelationship;
      let RelationshipPromiseCache = sedona._internalModel._relationshipPromisesCache;
      let RelationshipProxyCache = sedona._internalModel._relationshipProxyCache;

      assert.equal(relationshipState.isAsync, true, 'The relationship is async');
      assert.equal(relationshipState.relationshipIsEmpty, false, 'The relationship is not empty');
      assert.equal(relationshipState.hasDematerializedInverse, true, 'The relationship inverse is dematerialized');
      assert.equal(
        relationshipState.allInverseRecordsAreLoaded,
        false,
        'The relationship is missing some or all related resources'
      );
      assert.equal(relationshipState.hasAnyRelationshipData, true, 'The relationship knows which record it needs');
      assert.equal(!!RelationshipPromiseCache['parent'], false, 'The relationship has no fetch promise');
      assert.equal(relationshipState.hasFailedLoadAttempt === true, true, 'The relationship has attempted a load');
      assert.equal(relationshipState.shouldForceReload === false, true, 'The relationship will not force a reload');
      assert.equal(!!RelationshipProxyCache['parent'], true, 'The relationship has a promise proxy');
      assert.equal(!!relationshipState.link, false, 'The relationship does not have a link');

      try {
        let result = await sedona.get('parent');
        assert.ok(result === null, 're-access is safe');
      } catch (e) {
        assert.ok(false, `Accessing resulted in rejected promise error: ${e.message}`);
      }

      Ember.onerror = originalOnError;
    });
  });
});
