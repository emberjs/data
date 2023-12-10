import { get } from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

class Family extends Model {
  @hasMany('person', { async: true, inverse: 'family' }) persons;
  @attr name;
}

class Team extends Model {
  @hasMany('person', { async: true, inverse: 'team' }) persons;
  @attr name;
}

class Person extends Model {
  @belongsTo('family', { async: true, inverse: 'persons' }) family;
  @belongsTo('team', { async: false, inverse: 'persons' }) team;
}

module('integration/references/belongs-to', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:family', Family);
    this.owner.register('model:team', Team);
    this.owner.register('model:person', Person);

    this.owner.register('adapter:application', JSONAPIAdapter);
    this.owner.register('serializer:application', JSONAPISerializer);
  });

  testInDebug("record#belongsTo asserts when specified relationship doesn't exist", function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });

    assert.expectAssertion(function () {
      person.belongsTo('unknown-relationship');
    }, "Expected a relationship schema for 'person.unknown-relationship', but no relationship schema was found.");
  });

  testInDebug(
    "record#belongsTo asserts when the type of the specified relationship isn't the requested one",
    function (assert) {
      const store = this.owner.lookup('service:store');

      const family = store.push({
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
    const store = this.owner.lookup('service:store');

    const person = store.push({
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

    const familyReference = person.belongsTo('family');

    assert.strictEqual(familyReference.remoteType(), 'id');
    assert.strictEqual(familyReference.type, 'family');
    assert.strictEqual(familyReference.id(), '1');
  });

  test('record#belongsTo for a linked reference', function (assert) {
    const store = this.owner.lookup('service:store');

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
    assert.strictEqual(familyReference.type, 'family');
    assert.strictEqual(familyReference.link(), '/families/1');
  });

  test('BelongsToReference#meta() returns the most recent meta for the relationship', async function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
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

    const familyReference = person.belongsTo('family');
    assert.deepEqual(familyReference.meta(), { foo: true });
  });

  test('push(object) works with resources', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Family = store.modelFor('family');

    const person = store.push({
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

    const familyReference = person.belongsTo('family');

    const data = {
      data: {
        type: 'family',
        id: '1',
        attributes: {
          name: 'Coreleone',
        },
      },
    };

    const record = await familyReference.push(data);
    assert.true(record instanceof Family, 'push resolves with the referenced record');
    assert.strictEqual(record.name, 'Coreleone', 'name is set');
  });

  test('push(object) works with resource identifiers (skipLoad: false)', async function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            data: { type: 'family', id: '1' },
          },
        },
      },
      included: [
        {
          type: 'family',
          id: '2',
          attributes: {
            name: 'Don Coreleone',
          },
        },
      ],
    });

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.id(), '1', 'id is correct');

    const record = await familyReference.push({
      data: {
        type: 'family',
        id: '2',
      },
    });
    assert.strictEqual(familyReference.id(), '2', 'id is correct');
    assert.strictEqual(record.name, 'Don Coreleone', 'name is correct');
  });

  test('push(object) works with resource identifiers (skipLoad: true)', async function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
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

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.id(), '1', 'id is correct');

    await familyReference.push(
      {
        data: {
          type: 'family',
          id: '2',
        },
      },
      true
    );
    assert.strictEqual(familyReference.id(), '2', 'id is correct');
  });

  test('push(object) works with null data', async function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
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

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.id(), '1', 'id is correct');

    await familyReference.push({
      data: null,
    });
    assert.strictEqual(familyReference.id(), null, 'id is correct');
  });

  test('push(object) works with links', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Family = store.modelFor('family');

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            links: { related: '/person/1/families' },
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.remoteType(), 'link', 'remoteType is link');
    assert.strictEqual(familyReference.link(), '/person/1/families', 'initial link is correct');

    const data = {
      links: {
        related: '/person/1/families?page=1',
      },
      data: {
        type: 'family',
        id: '1',
        attributes: {
          name: 'Coreleone',
        },
      },
    };

    const record = await familyReference.push(data);
    assert.true(record instanceof Family, 'push resolves with the referenced record');
    assert.strictEqual(record.name, 'Coreleone', 'name is set');
    assert.strictEqual(familyReference.link(), '/person/1/families?page=1', 'link is updated');
  });

  test('push(object) works with links even when data is not present', async function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            links: { related: '/person/1/families' },
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.remoteType(), 'link', 'remoteType is link');
    assert.strictEqual(familyReference.link(), '/person/1/families', 'initial link is correct');
    assert.strictEqual(familyReference.id(), '1', 'id is correct');

    const data = {
      links: {
        related: '/person/1/families?page=1',
      },
    };

    await familyReference.push(data, true);
    assert.strictEqual(familyReference.id(), '1', 'id is still correct');
    assert.strictEqual(familyReference.link(), '/person/1/families?page=1', 'link is updated');
  });

  test('push(object) works with meta', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Family = store.modelFor('family');
    const timestamp1 = Date.now();
    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            meta: {
              createdAt: timestamp1,
            },
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    const familyReference = person.belongsTo('family');
    assert.deepEqual(familyReference.meta(), { createdAt: timestamp1 }, 'initial meta is correct');

    const timestamp2 = Date.now() + 1;
    const data = {
      meta: {
        updatedAt: timestamp2,
      },
      data: {
        type: 'family',
        id: '1',
        attributes: {
          name: 'Coreleone',
        },
      },
    };

    const record = await familyReference.push(data);
    assert.true(record instanceof Family, 'push resolves with the referenced record');
    assert.strictEqual(record.name, 'Coreleone', 'name is set');
    assert.deepEqual(familyReference.meta(), { updatedAt: timestamp2 }, 'meta is updated');
  });

  test('push(object) works with meta even when data is not present', async function (assert) {
    const store = this.owner.lookup('service:store');
    const timestamp1 = Date.now();
    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          family: {
            meta: {
              createdAt: timestamp1,
            },
            data: { type: 'family', id: '1' },
          },
        },
      },
    });

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.id(), '1', 'id is correct');
    assert.deepEqual(familyReference.meta(), { createdAt: timestamp1 }, 'initial meta is correct');

    const timestamp2 = Date.now() + 1;
    const data = {
      meta: {
        updatedAt: timestamp2,
      },
    };

    await familyReference.push(data, true);
    assert.strictEqual(familyReference.id(), '1', 'id is still correct');
    assert.deepEqual(familyReference.meta(), { updatedAt: timestamp2 }, 'meta is updated');
  });

  testInDebug('push(object) asserts for invalid modelClass', async function (assert) {
    class Family extends Model {
      @hasMany('person', { async: true, inverse: 'family' }) persons;
      @attr name;
    }

    class Person extends Model {
      @belongsTo('family', { async: true, inverse: 'persons' }) family;
    }

    this.owner.register('model:family', Family);
    this.owner.register('model:person', Person);

    const store = this.owner.lookup('service:store');

    const person = store.push({
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
    const anotherPerson = {
      data: {
        type: 'person',
        id: '2',
      },
    };

    const familyReference = person.belongsTo('family');

    await assert.expectAssertion(async function () {
      await familyReference.push(anotherPerson);
    }, "The 'person' type does not implement 'family' and thus cannot be assigned to the 'family' relationship in 'person'. If this relationship should be polymorphic, mark person.family as `polymorphic: true` and person.persons as implementing it via `as: 'family'`.");
  });

  testInDebug('push(object) works with polymorphic types', async function (assert) {
    class Family extends Model {
      @hasMany('person', { async: true, inverse: 'family', as: 'family' }) persons;
      @attr name;
    }

    class Person extends Model {
      @belongsTo('family', { async: true, inverse: 'persons', polymorphic: true }) family;
    }
    class MafiaFamily extends Model {
      @hasMany('person', { async: true, inverse: 'family', as: 'family' }) persons;
    }

    this.owner.register('model:family', Family);
    this.owner.register('model:person', Person);
    this.owner.register('model:mafia-family', MafiaFamily);
    const store = this.owner.lookup('service:store');

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Vito',
        },
      },
    });
    const mafiaFamily = {
      data: {
        type: 'mafia-family',
        id: '1',
        attributes: {
          name: 'Don',
        },
      },
    };

    const familyReference = person.belongsTo('family');
    const family = await familyReference.push(mafiaFamily);
    const record = store.peekRecord('mafia-family', '1');

    assert.strictEqual(family, record, 'we get back the correct record');
  });

  test('value() is null when reference is not yet loaded', function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
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

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.value(), null);
  });

  test('value() returns the referenced record when loaded', function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
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
    const family = store.push({
      data: {
        type: 'family',
        id: '1',
      },
    });

    const familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.value(), family);
  });

  test('value() returns the referenced record when loaded even if links are present', function (assert) {
    const store = this.owner.lookup('service:store');
    const person = store.push({
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
    const family = store.push({
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
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      return Promise.resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    const person = store.push({
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

    const familyReference = person.belongsTo('family');

    const record = await familyReference.load({ adapterOptions });

    assert.strictEqual(record.name, 'Coreleone');
  });

  test('load() fetches the record (sync belongsTo)', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      return Promise.resolve({
        data: {
          id: '1',
          type: 'team',
          attributes: { name: 'Tomsters' },
        },
      });
    };

    const person = store.push({
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

    const teamReference = person.belongsTo('team');

    const record = await teamReference.load({ adapterOptions });
    assert.strictEqual(record.name, 'Tomsters');
  });

  test('load() fetches link when remoteType is link', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      assert.strictEqual(link, '/families/1');

      return Promise.resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
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

    await familyReference.load({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });

  test('meta can be retrieved, even if the fetched data is null', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      assert.strictEqual(link, '/families/1', 'link was passed correctly');

      return Promise.resolve({
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
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    let count = 0;
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      count++;
      assert.strictEqual(count, 1);

      return Promise.resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    const person = store.push({
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

    const familyReference = person.belongsTo('family');

    await familyReference.reload({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });

  test('reload() - reloads the record when already loaded', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    let count = 0;
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      count++;
      assert.strictEqual(count, 1);

      return Promise.resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    const person = store.push({
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

    const familyReference = person.belongsTo('family');

    await familyReference.reload({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });

  test('reload() - uses link to reload record', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      assert.strictEqual(link, '/families/1');

      return Promise.resolve({
        data: {
          id: '1',
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
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

    await familyReference.reload({ adapterOptions }).then(function (record) {
      assert.strictEqual(get(record, 'name'), 'Coreleone');
    });
  });
});
