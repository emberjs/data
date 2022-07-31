import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { defer, resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/references/belongs-to', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Family = DS.Model.extend({
      persons: DS.hasMany(),
      name: DS.attr(),
    });

    const Person = DS.Model.extend({
      family: DS.belongsTo({ async: true }),
    });

    this.owner.register('model:family', Family);
    this.owner.register('model:person', Person);

    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  testInDebug("record#belongsTo asserts when specified relationship doesn't exist", function (assert) {
    let store = this.owner.lookup('service:store');

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
        },
      });
    });

    assert.expectAssertion(function () {
      run(function () {
        person.belongsTo('unknown-relationship');
      });
    }, 'Expected to find a relationship definition for person.unknown-relationship but none was found');
  });

  testInDebug(
    "record#belongsTo asserts when the type of the specified relationship isn't the requested one",
    function (assert) {
      let store = this.owner.lookup('service:store');

      var family;
      run(function () {
        family = store.push({
          data: {
            type: 'family',
            id: 1,
          },
        });
      });

      assert.expectAssertion(function () {
        run(function () {
          family.belongsTo('persons');
        });
      }, "You tried to get the 'persons' relationship on a 'family' via record.belongsTo('persons'), but the relationship is of kind 'hasMany'. Use record.hasMany('persons') instead.");
    }
  );

  test('record#belongsTo', function (assert) {
    let store = this.owner.lookup('service:store');

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');

    assert.strictEqual(familyReference.remoteType(), 'id');
    assert.strictEqual(familyReference.type, 'family');
    assert.strictEqual(familyReference.id(), '1');
  });

  test('record#belongsTo for a linked reference', function (assert) {
    let store = this.owner.lookup('service:store');

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              links: { related: '/families/1' },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');

    assert.strictEqual(familyReference.remoteType(), 'link');
    assert.strictEqual(familyReference.type, 'family');
    assert.strictEqual(familyReference.link(), '/families/1');
  });

  test('BelongsToReference#meta() returns the most recent meta for the relationship', async function (assert) {
    let store = this.owner.lookup('service:store');

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
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
    });

    var familyReference = person.belongsTo('family');
    assert.deepEqual(familyReference.meta(), { foo: true });
  });

  test('push(object)', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let Family = store.modelFor('family');

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');

    run(function () {
      var data = {
        data: {
          type: 'family',
          id: 1,
          attributes: {
            name: 'Coreleone',
          },
        },
      };

      familyReference.push(data).then(function (record) {
        assert.ok(Family.detectInstance(record), 'push resolves with the referenced record');
        assert.strictEqual(get(record, 'name'), 'Coreleone', 'name is set');

        done();
      });
    });
  });

  test('push(promise)', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let Family = store.modelFor('family');

    var push;
    var deferred = defer();

    run(function () {
      var person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
      var familyReference = person.belongsTo('family');
      push = familyReference.push(deferred.promise);
    });

    assert.ok(push.then, 'BelongsToReference.push returns a promise');

    run(function () {
      deferred.resolve({
        data: {
          type: 'family',
          id: 1,
          attributes: {
            name: 'Coreleone',
          },
        },
      });
    });

    run(function () {
      push.then(function (record) {
        assert.ok(Family.detectInstance(record), 'push resolves with the record');
        assert.strictEqual(get(record, 'name'), 'Coreleone', 'name is updated');

        done();
      });
    });
  });

  testInDebug('push(object) asserts for invalid modelClass', async function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: 1,
        relationships: {
          family: {
            data: { type: 'family', id: 1 },
          },
        },
      },
    });
    let anotherPerson = {
      data: {
        type: 'person',
        id: 2,
      },
    };

    let familyReference = person.belongsTo('family');

    await assert.expectAssertion(async function () {
      await familyReference.push(anotherPerson);
    }, "The 'person' type does not implement 'family' and thus cannot be assigned to the 'family' relationship in 'person'. Make it a descendant of 'family' or use a mixin of the same name.");
  });

  testInDebug('push(object) works with polymorphic modelClass', async function (assert) {
    let store = this.owner.lookup('service:store');
    let Family = store.modelFor('family');

    this.owner.register('model:mafia-family', Family.extend());

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

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.value(), null);
  });

  test('value() returns the referenced record when loaded', function (assert) {
    let store = this.owner.lookup('service:store');

    var person, family;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
      family = store.push({
        data: {
          type: 'family',
          id: 1,
        },
      });
    });

    var familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.value(), family);
  });

  test('value() returns the referenced record when loaded even if links are present', function (assert) {
    let store = this.owner.lookup('service:store');
    let person = store.push({
      data: {
        type: 'person',
        id: 1,
        relationships: {
          family: {
            data: { type: 'family', id: 1 },
          },
        },
      },
    });
    let family = store.push({
      data: {
        type: 'family',
        id: 1,
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

  test('load() fetches the record', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      return resolve({
        data: {
          id: 1,
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');

    run(function () {
      familyReference.load({ adapterOptions }).then(function (record) {
        assert.strictEqual(get(record, 'name'), 'Coreleone');

        done();
      });
    });
  });

  test('load() fetches link when remoteType is link', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      assert.strictEqual(link, '/families/1');

      return resolve({
        data: {
          id: 1,
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              links: { related: '/families/1' },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');
    assert.strictEqual(familyReference.remoteType(), 'link');

    run(function () {
      familyReference.load({ adapterOptions }).then(function (record) {
        assert.strictEqual(get(record, 'name'), 'Coreleone');

        done();
      });
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
        id: 1,
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

  test('reload() - loads the record when not yet loaded', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    var count = 0;
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      count++;
      assert.strictEqual(count, 1);

      return resolve({
        data: {
          id: 1,
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');

    run(function () {
      familyReference.reload({ adapterOptions }).then(function (record) {
        assert.strictEqual(get(record, 'name'), 'Coreleone');

        done();
      });
    });
  });

  test('reload() - reloads the record when already loaded', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    var count = 0;
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      count++;
      assert.strictEqual(count, 1);

      return resolve({
        data: {
          id: 1,
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              data: { type: 'family', id: 1 },
            },
          },
        },
      });
      store.push({
        data: {
          type: 'family',
          id: 1,
        },
      });
    });

    var familyReference = person.belongsTo('family');

    run(function () {
      familyReference.reload({ adapterOptions }).then(function (record) {
        assert.strictEqual(get(record, 'name'), 'Coreleone');

        done();
      });
    });
  });

  test('reload() - uses link to reload record', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findBelongsTo = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');

      assert.strictEqual(link, '/families/1');

      return resolve({
        data: {
          id: 1,
          type: 'family',
          attributes: { name: 'Coreleone' },
        },
      });
    };

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
          relationships: {
            family: {
              links: { related: '/families/1' },
            },
          },
        },
      });
    });

    var familyReference = person.belongsTo('family');

    run(function () {
      familyReference.reload({ adapterOptions }).then(function (record) {
        assert.strictEqual(get(record, 'name'), 'Coreleone');

        done();
      });
    });
  });
});
