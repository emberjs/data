import { get } from '@ember/object';

import { module, test } from 'qunit';
import { defer, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/references/belongs-to', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Family = Model.extend({
      persons: hasMany('person', { async: true, inverse: 'family' }),
      name: attr(),
    });

    const Team = Model.extend({
      persons: hasMany('person', { async: true, inverse: 'team' }),
      name: attr(),
    });

    const Person = Model.extend({
      family: belongsTo('family', { async: true, inverse: 'persons' }),
      team: belongsTo('team', { async: false, inverse: 'persons' }),
    });

    this.owner.register('model:family', Family);
    this.owner.register('model:team', Team);
    this.owner.register('model:person', Person);

    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  testInDebug("record#belongsTo asserts when specified relationship doesn't exist", function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });

    assert.expectAssertion(function () {
      person.belongsTo('unknown-relationship');
    }, 'Expected to find a relationship definition for person.unknown-relationship but none was found');
  });

  testInDebug(
    "record#belongsTo asserts when the type of the specified relationship isn't the requested one",
    function (assert) {
      let store = this.owner.lookup('service:store');

      let family = store.push({
        data: {
          type: 'family',
          id: '1',
        },
      });

      assert.expectAssertion(function () {
        family.belongsTo('persons');
      }, "You tried to get the 'persons' relationship on a 'family' via record.belongsTo('persons'), but the relationship is of kind 'hasMany'. Use record.hasMany('persons') instead.");
    }
  );

  test('record#belongsTo', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');

    assert.strictEqual(familyReference.remoteType(), 'id');
    assert.strictEqual(familyReference.type, 'family');
    assert.strictEqual(familyReference.id(), '1');
  });

  test('record#belongsTo for a linked reference', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            links: { related: '/families/1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');

    assert.strictEqual(familyReference.remoteType(), 'link');
    assert.strictEqual(familyReference.type, 'family');
    assert.strictEqual(familyReference.link(), '/families/1');
  });

  test('BelongsToReference#meta() returns the most recent meta for the relationship', async function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            links: {
              related: '/families/1',
            },
            meta: {
              foo: true,
            },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');
    assert.deepEqual(familyReference.meta(), { foo: true });
  });

  test('push(object)', async function (assert) {
    let store = this.owner.lookup('service:store');
    let Family = store.modelFor('family');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');

    let data = {
      data: {
        type: 'family',
        id: '1',
        attributes: {
          name: 'Coreleone',
        },
      },
    };

    const record = await familyReference.push(data);
    assert.ok(Family.detectInstance(record), 'push resolves with the referenced record');
    assert.strictEqual(get(record, 'name'), 'Coreleone', 'name is set');
  });

  deprecatedTest(
    'push(promise)',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0', count: 1 },
    async function (assert) {
      let store = this.owner.lookup('service:store');
      let Family = store.modelFor('family');

      let push;
      let deferred = defer();

      let person = store.push({
        data: {
          type: 'person',
          id: '1',
          relationships: {
            family: {
              data: { type: 'family', id: '1' },
            },
          },
        },
      });
      let familyReference = person.belongsTo('family');
      push = familyReference.push(deferred.promise);

      assert.ok(push.then, 'BelongsToReference.push returns a promise');

      deferred.resolve({
        data: {
          type: 'family',
          id: '1',
          attributes: {
            name: 'Coreleone',
          },
        },
      });

      await push.then(function (record) {
        assert.ok(record instanceof Family, 'push resolves with the record');
        assert.strictEqual(record.name, 'Coreleone', 'name is updated');
      });
    }
  );

  testInDebug('push(object) asserts for invalid modelClass', async function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });
    let anotherPerson = {
      data: {
        type: 'person',
        id: '2',
      },
    };

    let familyReference = person.belongsTo('family');

    await assert.expectAssertion(async function () {
      await familyReference.push(anotherPerson);
    }, "The 'person' type does not implement 'family' and thus cannot be assigned to the 'family' relationship in 'person'. Make it a descendant of 'family' or use a mixin of the same name.");
  });

  testInDebug('push(object) works with polymorphic types', async function (assert) {
    const Family = Model.extend({
      persons: hasMany('person', { async: true, inverse: 'family', as: 'family' }),
      name: attr(),
    });

    const Person = Model.extend({
      family: belongsTo('family', { async: true, inverse: 'persons', polymorphic: true }),
    });

    this.owner.register('model:family', Family);
    this.owner.register('model:person', Person);
    this.owner.register('model:mafia-family', Family.extend());
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });
    let mafiaFamily = {
      data: {
        type: 'mafia-family',
        id: '1',
      },
    };

    let familyReference = person.belongsTo('family');
    let family = await familyReference.push(mafiaFamily);
    const record = store.peekRecord('mafia-family', '1');

    assert.strictEqual(family, record);
  });

  test('value() is null when reference is not yet loaded', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.value(), null);
  });

  test('value() returns the referenced record when loaded', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });
    let family = store.push({
      data: {
        type: 'family',
        id: '1',
      },
    });

    let familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.value(), family);
  });

  test('value() returns the referenced record when loaded even if links are present', function (assert) {
    let store = this.owner.lookup('service:store');
    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });
    let family = store.push({
      data: {
        type: 'family',
        id: '1',
        relationships: {
          persons: {
            links: {
              related: '/this/should/not/matter',
            },
          },
        },
      },
    });

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.value(), family);
  });

  test('load() fetches the record', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      return resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');

    const record = await familyReference.load({ adapterOptions });

    assert.strictEqual(record.name, 'Coreleone');
  });

  test('load() fetches the record (sync belongsTo)', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      return resolve({
        data: {
          id: '1',
          type: 'team',
          attributes: { name: 'Tomsters' },
        },
      });
    };

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          team: {
            data: { type: 'team', id: '1' },
          },
        },
      },
    });

    let teamReference = person.belongsTo('team');

    const record = await teamReference.load({ adapterOptions });
    assert.strictEqual(record.name, 'Tomsters');
  });

  test('load() fetches link when remoteType is link', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      assert.strictEqual(link, '/families/1');

      return resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            links: { related: '/families/1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.remoteType(), 'link');

    await familyReference.load({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });

  test('meta can be retrieved, even if the fetched data is null', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      assert.strictEqual(link, '/families/1', 'link was passed correctly');

      return resolve({
        data: null,
        meta: { it: 'works' },
      });
    };

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            links: { related: '/families/1' },
          },
        },
      },
    });

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.remoteType(), 'link');

    const record = await familyReference.load({ adapterOptions });
    const meta = familyReference.meta();
    assert.strictEqual(record, null, 'we have no record');
    assert.deepEqual(meta, { it: 'works' }, 'meta is available');
  });

  test('reload() - loads the record when not yet loaded', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    let count = 0;
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      count++;
      assert.strictEqual(count, 1);

      return resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');

    await familyReference.reload({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });

  test('reload() - reloads the record when already loaded', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    let count = 0;
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      count++;
      assert.strictEqual(count, 1);

      return resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
    });
    store.push({
      data: {
        type: 'family',
        id: '1',
      },
    });

    let familyReference = person.belongsTo('family');

    await familyReference.reload({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });

  test('reload() - uses link to reload record', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      assert.strictEqual(link, '/families/1');

      return resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            links: { related: '/families/1' },
          },
        },
      },
    });

    let familyReference = person.belongsTo('family');

    await familyReference.reload({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });
});
