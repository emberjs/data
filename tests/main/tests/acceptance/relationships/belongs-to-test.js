import { render, settled } from '@ember/test-helpers';
import Ember from 'ember';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { Promise, reject, resolve } from 'rsvp';

import { setupRenderingTest } from 'ember-qunit';

import { ServerError } from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { LEGACY_SUPPORT } from '@ember-data/model/-private';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store, { recordIdentifierFor } from '@ember-data/store';

import { implicitRelationshipsFor } from '../../helpers/accessors';

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
  // inverse is an implicit hasMany relationship
  @belongsTo('person', { async: true, inverse: null })
  petOwner;
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
    this.pausePromise = new Promise((resolve) => {
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
  findBelongsTo() {
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

  updateRecord() {
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
    {
      type: 'person',
      id: '6:has-linked-parent',
      attributes: { name: 'Has a linked Parent' },
      relationships: {
        children: { data: [] },
        parent: {
          links: {
            related: '/person/7',
          },
        },
      },
    },
  ];

  let peopleHash = {};
  people.forEach((person) => {
    peopleHash[person.id] = person;
  });

  return {
    dict: peopleHash,
    all: people,
  };
}

module('async belongs-to rendering tests', function (hooks) {
  let store;
  let adapter;
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
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

  module('for local changes', function (hooks) {
    hooks.beforeEach(function () {
      let { owner } = this;
      owner.register('model:person', Person);
      owner.register('model:pet', Pet);
    });

    test('record is removed from implicit relationships when destroyed', async function (assert) {
      const pete = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: { name: 'Pete' },
        },
      });

      const goofy = store.push({
        data: {
          type: 'pet',
          id: '1',
          attributes: { name: 'Goofy' },
          relationships: {
            petOwner: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });

      const storeWrapper = store._instanceCache._storeWrapper;
      const identifier = recordIdentifierFor(pete);
      const implicitRelationships = implicitRelationshipsFor(storeWrapper, identifier);
      const implicitKeys = Object.keys(implicitRelationships);
      const petOwnerImplicit = implicitRelationships[implicitKeys[0]];

      assert.strictEqual(
        implicitKeys.length,
        1,
        `Expected only one implicit relationship, found ${implicitKeys.join(', ')}`
      );
      assert.strictEqual(petOwnerImplicit.remoteMembers.size, 1, 'initial size is correct');

      const tweety = store.push({
        data: {
          type: 'pet',
          id: '2',
          attributes: { name: 'Tweety' },
          relationships: {
            petOwner: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });

      assert.strictEqual(petOwnerImplicit.remoteMembers.size, 2, 'size after push is correct');

      let petOwner = await goofy.petOwner;
      assert.strictEqual(petOwner.name, 'Pete', 'We have the expected owner for goofy');

      petOwner = await tweety.petOwner;
      assert.strictEqual(petOwner.name, 'Pete', 'We have the expected owner for tweety');

      await goofy.destroyRecord();
      assert.ok(goofy.isDeleted, 'goofy is deleted after calling destroyRecord');

      await tweety.destroyRecord();
      assert.ok(tweety.isDeleted, 'tweety is deleted after calling destroyRecord');

      assert.strictEqual(petOwnerImplicit.remoteMembers.size, 0);

      const jerry = store.push({
        data: {
          type: 'pet',
          id: '3',
          attributes: { name: 'Jerry' },
          relationships: {
            petOwner: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });

      petOwner = await jerry.petOwner;
      assert.strictEqual(petOwner.name, 'Pete');

      assert.strictEqual(petOwnerImplicit.remoteMembers.size, 1);

      await settled();
    });

    test('async belongsTo returns correct new value after a local change', async function (assert) {
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
      let bestDog = await chris.bestDog;

      this.set('chris', chris);

      await render(hbs`
      <p>{{this.chris.bestDog.name}}</p>
      `);
      await settled();

      assert.strictEqual(this.element.textContent.trim(), '', 'initially there is no name for bestDog');
      assert.strictEqual(shen.bestHuman, null, 'precond - Shen has no best human');
      assert.strictEqual(pirate.bestHuman, null, 'precond - pirate has no best human');
      assert.strictEqual(bestDog, null, 'precond - Chris has no best dog');

      // locally update
      chris.set('bestDog', shen);
      bestDog = await chris.bestDog;
      await settled();

      assert.strictEqual(this.element.textContent.trim(), 'Shen');
      assert.strictEqual(shen.bestHuman, chris, "scene 1 - Chris is Shen's best human");
      assert.strictEqual(pirate.bestHuman, null, 'scene 1 - pirate has no best human');
      assert.strictEqual(bestDog, shen, "scene 1 - Shen is Chris's best dog");

      // locally update to a different value
      chris.set('bestDog', pirate);
      bestDog = await chris.bestDog;
      await settled();

      assert.strictEqual(this.element.textContent.trim(), 'Pirate');
      assert.strictEqual(shen.bestHuman, null, "scene 2 - Chris is no longer Shen's best human");
      assert.strictEqual(pirate.bestHuman, chris, 'scene 2 - pirate now has Chris as best human');
      assert.strictEqual(bestDog, pirate, "scene 2 - Pirate is now Chris's best dog");

      // locally clear the relationship
      chris.set('bestDog', null);
      bestDog = await chris.bestDog;
      await settled();

      assert.strictEqual(this.element.textContent.trim(), '');
      assert.strictEqual(shen.bestHuman, null, "scene 3 - Chris remains no longer Shen's best human");
      assert.strictEqual(pirate.bestHuman, null, 'scene 3 - pirate no longer has Chris as best human');
      assert.strictEqual(bestDog, null, 'scene 3 - Chris has no best dog');
    });
  });

  module('for data-no-link scenarios', function () {
    test('We can render an async belongs-to', async function (assert) {
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [{ data: people.dict['3:has-2-children-and-parent'] }]);

      // render
      this.set('sedona', sedona);

      await render(hbs`
      <p>{{this.sedona.parent.name}}</p>
      `);

      assert.strictEqual(this.element.textContent.trim(), 'Kevin has two children and one parent');
    });

    test('We can delete an async belongs-to', async function (assert) {
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [{ data: people.dict['3:has-2-children-and-parent'] }]);

      // render
      this.set('sedona', sedona);

      await render(hbs`
      <p>{{this.sedona.parent.name}}</p>
      `);

      let parent = await sedona.parent;
      await parent.destroyRecord();
      let newParent = await sedona.parent;

      assert.strictEqual(newParent, null, 'We no longer have a parent');
      assert.strictEqual(
        this.element.textContent.trim(),
        '',
        "We no longer render our parent's name because we no longer have a parent"
      );
    });

    test('Re-rendering an async belongsTo does not cause a new fetch', async function (assert) {
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [{ data: people.dict['3:has-2-children-and-parent'] }]);

      // render
      this.set('sedona', sedona);

      await render(hbs`
      <p>{{this.sedona.parent.name}}</p>
      `);

      assert.strictEqual(this.element.textContent.trim(), 'Kevin has two children and one parent');

      this.set('sedona', null);
      assert.strictEqual(this.element.textContent.trim(), '');

      this.set('sedona', sedona);
      assert.strictEqual(this.element.textContent.trim(), 'Kevin has two children and one parent');
    });

    test('Rendering an async belongs-to whose fetch fails does not trigger a new request', async function (assert) {
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['5:has-parent-no-children'],
      });

      adapter.setupPayloads(assert, [
        new ServerError([], 'hard error while finding <person>5:has-parent-no-children.parent'),
      ]);

      // render
      this.set('sedona', sedona);

      let originalOnError = Ember.onerror;
      let hasFired = false;
      Ember.onerror = function (e) {
        if (!hasFired) {
          hasFired = true;
          assert.ok(true, 'Children promise did reject');
          assert.strictEqual(
            e.message,
            'hard error while finding <person>5:has-parent-no-children.parent',
            'Rejection has the correct message'
          );
        } else {
          assert.ok(false, 'We only reject a single time');
          adapter.pause(); // prevent further recursive calls to load the relationship
        }
      };

      await render(hbs`
      <p>{{this.sedona.parent.name}}</p>
      `);

      assert.strictEqual(this.element.textContent.trim(), '', 'we have no parent');

      const relationship = sedona.belongsTo('parent').belongsToRelationship;
      const { state, definition } = relationship;
      let RelationshipPromiseCache = LEGACY_SUPPORT.get(sedona)._relationshipPromisesCache;
      let RelationshipProxyCache = LEGACY_SUPPORT.get(sedona)._relationshipProxyCache;

      assert.true(definition.isAsync, 'The relationship is async');
      assert.false(state.isEmpty, 'The relationship is not empty');
      assert.true(state.hasDematerializedInverse, 'The relationship inverse is dematerialized');
      assert.true(state.hasReceivedData, 'The relationship knows which record it needs');
      assert.false(!!RelationshipPromiseCache['parent'], 'The relationship has no fetch promise');
      assert.true(state.hasFailedLoadAttempt, 'The relationship has attempted a load');
      assert.false(state.shouldForceReload, 'The relationship will not force a reload');
      assert.true(!!RelationshipProxyCache['parent'], 'The relationship has a promise proxy');
      assert.false(!!relationship.link, 'The relationship does not have a link');

      try {
        let result = await sedona.parent.content;
        assert.strictEqual(result, null, 're-access is safe');
      } catch (e) {
        assert.ok(false, `Accessing resulted in rejected promise error: ${e.message}`);
      }

      try {
        await sedona.parent;
        assert.ok(false, 're-access should throw original rejection');
      } catch (e) {
        assert.ok(true, `Accessing resulted in rejected promise error: ${e.message}`);
      }

      Ember.onerror = originalOnError;
    });

    test('accessing a linked async belongs-to whose fetch fails does not error for null proxy content', async function (assert) {
      assert.expect(3);
      let people = makePeopleWithRelationshipData();
      let sedona = store.push({
        data: people.dict['6:has-linked-parent'],
      });

      const error = 'hard error while finding <person>7:does-not-exist';
      adapter.setupPayloads(assert, [new ServerError([], error)]);

      try {
        await sedona.parent;
        assert.ok(false, `should have rejected`);
      } catch (e) {
        assert.strictEqual(e.message, error, `should have rejected with '${error}'`);
      }

      await render(hbs`
      <p>{{this.sedona.parent.name}}</p>
      `);

      assert.strictEqual(this.element.textContent.trim(), '', 'we have no parent');

      try {
        await sedona.parent;
        assert.ok(false, `should have rejected`);
      } catch (e) {
        assert.strictEqual(e.message, error, `should have rejected with '${error}'`);
      }
    });
  });

  test('Can reset a previously failed linked async belongs-to', async function (assert) {
    assert.expect(5);
    let people = makePeopleWithRelationshipData();
    let sedona = store.push({
      data: people.dict['6:has-linked-parent'],
    });

    adapter.setupPayloads(assert, [new ServerError([], 'person not found'), new ServerError([], 'person not found')]);

    // render
    this.set('sedona', sedona);

    let originalOnError = Ember.onerror;
    Ember.onerror = function (e) {
      assert.ok(true, 'Rejects the first time');
    };

    await render(hbs`
    <p>{{this.sedona.parent.name}}</p>
    `);

    const newParent = store.createRecord('person', { name: 'New Person' });
    sedona.set('parent', newParent);
    await settled();
    assert.strictEqual(
      this.element.textContent.trim(),
      'New Person',
      'after resetting to a new record, shows new content on page'
    );
    newParent.unloadRecord();
    await settled();
    assert.strictEqual(this.element.textContent.trim(), '', 'after unloading the record it shows no content on page');
    try {
      await sedona.belongsTo('parent').reload();
      assert.ok(false, 'we should have thrown an error');
    } catch (e) {
      assert.strictEqual(e.message, 'person not found', 'we threw a not found error');
      assert.strictEqual(adapter._payloads.length, 0, 'we hit network again');
    }
    Ember.onerror = originalOnError;
  });
});
