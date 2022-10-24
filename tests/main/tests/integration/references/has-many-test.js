import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { defer, resolve } from 'rsvp';

import { gte } from 'ember-compatibility-helpers';
import { setupRenderingTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

import createTrackingContext from '../../helpers/create-tracking-context';

module('integration/references/has-many', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    const Family = Model.extend({
      persons: hasMany('person', { async: true, inverse: 'family' }),
    });

    const Person = Model.extend({
      name: attr(),
      family: belongsTo('family', { async: true, inverse: 'persons' }),
      pets: hasMany('pet', { async: true, inverse: null }),
    });

    const Pet = Model.extend({
      name: attr(),
    });

    this.owner.register('model:family', Family);
    this.owner.register('model:person', Person);
    this.owner.register('model:pet', Pet);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  testInDebug("record#hasMany asserts when specified relationship doesn't exist", function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
        },
      });
    });

    assert.expectAssertion(function () {
      run(function () {
        family.hasMany('unknown-relationship');
      });
    }, 'Expected to find a relationship definition for family.unknown-relationship but none was found');
  });

  testInDebug(
    "record#hasMany asserts when the type of the specified relationship isn't the requested one",
    function (assert) {
      let store = this.owner.lookup('service:store');

      var person;
      run(function () {
        person = store.push({
          data: {
            type: 'person',
            id: '1',
          },
        });
      });

      assert.expectAssertion(function () {
        run(function () {
          person.hasMany('family');
        });
      }, "You tried to get the 'family' relationship on a 'person' via record.hasMany('family'), but the relationship is of kind 'belongsTo'. Use record.belongsTo('family') instead.");
    }
  );

  test('record#hasMany', function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');

    assert.strictEqual(personsReference.remoteType(), 'ids');
    assert.strictEqual(personsReference.type, 'person');
    assert.deepEqual(personsReference.ids(), ['1', '2']);
  });

  test('record#hasMany for linked references', function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              links: { related: '/families/1/persons' },
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');

    assert.strictEqual(personsReference.remoteType(), 'link');
    assert.strictEqual(personsReference.type, 'person');
    assert.strictEqual(personsReference.link(), '/families/1/persons');
  });

  test('HasManyReference#meta() returns the most recent meta for the relationship', function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              links: { related: '/families/1/persons' },
              meta: {
                foo: true,
              },
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');
    assert.deepEqual(personsReference.meta(), { foo: true });
  });

  if (gte('3.16.0')) {
    test('HasManyReference#value() does not create accidental autotracking errors', async function (assert) {
      let store = this.owner.lookup('service:store');
      let family = store.push({
        data: {
          type: 'family',
          id: '1',
        },
      });

      let personsReference = family.hasMany('persons');
      let renderedValue;
      let context = await createTrackingContext(this.owner, {
        get value() {
          renderedValue = personsReference.value();
          return renderedValue;
        },
      });

      await context.render();

      assert.strictEqual(renderedValue, null, 'We have no value yet, we are not loaded');

      store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [{ type: 'person', id: '1' }],
            },
          },
        },
      });

      await context.render();

      assert.strictEqual(renderedValue, null, 'We have no value yet, we are still not loaded');

      let person1 = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            family: {
              data: { type: 'family', id: '1' },
            },
          },
        },
      });

      await context.render();

      assert.strictEqual(renderedValue.length, 1, 'We have a value');
      assert.strictEqual(renderedValue.at(0), person1, 'We have the right value');

      store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
        included: [
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'James',
            },
            relationships: {
              family: {
                data: { type: 'family', id: '1' },
              },
            },
          },
        ],
      });

      await context.render();

      let person2 = store.peekRecord('person', '2');
      assert.notStrictEqual(person2, null, 'we have a person');
      assert.strictEqual(renderedValue.length, 2, 'We have two values');
      assert.strictEqual(renderedValue.at(0), person1, 'We have the right value[0]');
      assert.strictEqual(renderedValue.at(1), person2, 'We have the right value[1]');
    });
  }

  testInDebug('push(array)', async function (assert) {
    const store = this.owner.lookup('service:store');
    const family = store.push({
      data: {
        type: 'family',
        id: '1',
        relationships: {
          persons: {
            data: [
              { type: 'person', id: '1' },
              { type: 'person', id: '2' },
            ],
          },
        },
      },
    });

    const personsReference = family.hasMany('persons');
    const data = [
      { data: { type: 'person', id: '1', attributes: { name: 'Vito' } } },
      { data: { type: 'person', id: '2', attributes: { name: 'Michael' } } },
    ];

    const records = await personsReference.push(data);
    assert.strictEqual(get(records, 'length'), 2);
    assert.strictEqual(records.at(0).name, 'Vito');
    assert.strictEqual(records.at(1).name, 'Michael');
  });

  testInDebug('push(array) works with polymorphic type', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let Person = store.modelFor('person');

    this.owner.register('model:mafia-boss', Person.extend());

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
        },
      });
    });

    var personsReference = family.hasMany('persons');

    run(() => {
      var data = [{ data: { type: 'mafia-boss', id: '1', attributes: { name: 'Vito' } } }];

      personsReference.push(data).then(function (records) {
        assert.strictEqual(get(records, 'length'), 1);
        assert.strictEqual(records.at(0).name, 'Vito');

        done();
      });
    });
  });

  testInDebug('push(array) asserts polymorphic type', async function (assert) {
    let store = this.owner.lookup('service:store');
    let family = store.push({
      data: {
        type: 'family',
        id: '1',
      },
    });
    let personsReference = family.hasMany('persons');

    assert.expectAssertion(async () => {
      await personsReference.push([{ data: { type: 'family', id: '1' } }]);
    }, "The 'family' type does not implement 'person' and thus cannot be assigned to the 'persons' relationship in 'family'. Make it a descendant of 'person' or use a mixin of the same name.");
  });

  testInDebug('push(object) supports legacy, non-JSON-API-conform payload', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');

    run(function () {
      var payload = {
        data: [
          { data: { type: 'person', id: '1', attributes: { name: 'Vito' } } },
          { data: { type: 'person', id: '2', attributes: { name: 'Michael' } } },
        ],
      };

      personsReference.push(payload).then(function (records) {
        assert.strictEqual(get(records, 'length'), 2);
        assert.strictEqual(records.at(0).name, 'Vito');
        assert.strictEqual(records.at(1).name, 'Michael');

        done();
      });
    });
  });

  deprecatedTest(
    'push(promise)',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0', count: 1 },
    async function (assert) {
      const store = this.owner.lookup('service:store');
      const deferred = defer();

      const family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
      });
      const personsReference = family.hasMany('persons');
      let pushResult = personsReference.push(deferred.promise);

      assert.ok(pushResult.then, 'HasManyReference.push returns a promise');

      const payload = {
        data: [
          { data: { type: 'person', id: '1', attributes: { name: 'Vito' } } },
          { data: { type: 'person', id: '2', attributes: { name: 'Michael' } } },
        ],
      };

      deferred.resolve(payload);

      const records = await pushResult;
      assert.strictEqual(get(records, 'length'), 2);
      assert.strictEqual(records.at(0).name, 'Vito');
      assert.strictEqual(records.at(1).name, 'Michael');
    }
  );

  test('push valid json:api', async function (assert) {
    const store = this.owner.lookup('service:store');

    const family = store.push({
      data: {
        type: 'family',
        id: '1',
        relationships: {
          persons: {
            data: [
              { type: 'person', id: '1' },
              { type: 'person', id: '2' },
            ],
          },
        },
      },
    });
    const personsReference = family.hasMany('persons');
    const payload = {
      data: [
        { type: 'person', id: '1', attributes: { name: 'Vito' } },
        { type: 'person', id: '2', attributes: { name: 'Michael' } },
      ],
    };
    const pushResult = personsReference.push(payload);
    assert.ok(pushResult.then, 'HasManyReference.push returns a promise');

    const records = await pushResult;
    assert.strictEqual(get(records, 'length'), 2);
    assert.strictEqual(records.at(0).name, 'Vito');
    assert.strictEqual(records.at(1).name, 'Michael');
  });

  test('value() returns null when reference is not yet loaded', function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');
    assert.strictEqual(personsReference.value(), null);
  });

  test('value() returns the referenced records when all records are loaded', function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
      });
      store.push({ data: { type: 'person', id: '1', attributes: { name: 'Vito' } } });
      store.push({ data: { type: 'person', id: '2', attributes: { name: 'Michael' } } });
    });

    run(function () {
      var personsReference = family.hasMany('persons');
      var records = personsReference.value();
      assert.strictEqual(get(records, 'length'), 2);
      assert.true(records.every((v) => v.isLoaded));
    });
  });

  test('value() returns an empty array when the reference is loaded and empty', function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [],
            },
          },
        },
      });
    });

    run(function () {
      var personsReference = family.hasMany('persons');
      var records = personsReference.value();
      assert.strictEqual(get(records, 'length'), 0);
    });
  });

  test('_isLoaded() returns an true array when the reference is loaded and empty', function (assert) {
    let store = this.owner.lookup('service:store');

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [],
            },
          },
        },
      });
    });

    run(function () {
      var personsReference = family.hasMany('persons');
      var isLoaded = personsReference._isLoaded();
      assert.true(isLoaded);
    });
  });

  test('load() fetches the referenced records', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findMany = function (store, type, id, snapshots) {
      assert.strictEqual(snapshots[0].adapterOptions, adapterOptions, 'adapterOptions are passed in');
      return resolve({
        data: [
          { id: '1', type: 'person', attributes: { name: 'Vito' } },
          { id: '2', type: 'person', attributes: { name: 'Michael' } },
        ],
      });
    };

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');

    run(function () {
      personsReference.load({ adapterOptions }).then(function (records) {
        assert.strictEqual(get(records, 'length'), 2);
        assert.strictEqual(records.at(0).name, 'Vito');
        assert.strictEqual(records.at(1).name, 'Michael');

        done();
      });
    });
  });

  test('load() fetches link when remoteType is link', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findHasMany = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      assert.strictEqual(link, '/families/1/persons');

      return resolve({
        data: [
          { id: '1', type: 'person', attributes: { name: 'Vito' } },
          { id: '2', type: 'person', attributes: { name: 'Michael' } },
        ],
      });
    };

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              links: { related: '/families/1/persons' },
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');
    assert.strictEqual(personsReference.remoteType(), 'link');

    run(function () {
      personsReference.load({ adapterOptions }).then(function (records) {
        assert.strictEqual(get(records, 'length'), 2);
        assert.strictEqual(records.at(0).name, 'Vito');
        assert.strictEqual(records.at(1).name, 'Michael');

        done();
      });
    });
  });

  test('load() fetches link when remoteType is link but an empty set of records is returned', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findHasMany = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      assert.strictEqual(link, '/families/1/persons');

      return resolve({ data: [] });
    };

    let family;
    run(() => {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              links: { related: '/families/1/persons' },
            },
          },
        },
      });
    });

    let personsReference = family.hasMany('persons');
    assert.strictEqual(personsReference.remoteType(), 'link');

    return run(() => {
      return personsReference.load({ adapterOptions }).then((records) => {
        assert.strictEqual(get(records, 'length'), 0);
        assert.strictEqual(get(personsReference.value(), 'length'), 0);
      });
    });
  });

  test('load() - only a single find is triggered', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let resolveRequest;
    let defered = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    let count = 0;

    adapter.findMany = function (store, type, id) {
      count++;
      assert.strictEqual(count, 1);

      return defered;
    };

    const family = store.push({
      data: {
        type: 'family',
        id: '1',
        relationships: {
          persons: {
            data: [
              { type: 'person', id: '1' },
              { type: 'person', id: '2' },
            ],
          },
        },
      },
    });

    const personsReference = family.hasMany('persons');

    personsReference.load(); // first trigger
    const recordsPromise = personsReference.load(); // second trigger

    resolveRequest({
      data: [
        { id: '1', type: 'person', attributes: { name: 'Vito' } },
        { id: '2', type: 'person', attributes: { name: 'Michael' } },
      ],
    });

    const records = await recordsPromise;
    assert.strictEqual(records.length, 2, 'we loaded the right number of records');

    const recordsAgain = await personsReference.load(); // third trigger
    assert.strictEqual(recordsAgain.length, 2, 'we still have the right number of records');
    assert.strictEqual(count, 1, 'we only requested records once');
  });

  test('reload()', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    adapter.findMany = function (store, type, id, snapshots) {
      assert.strictEqual(snapshots[0].adapterOptions, adapterOptions, 'adapterOptions are passed in');
      return resolve({
        data: [
          { id: '1', type: 'person', attributes: { name: 'Vito Coreleone' } },
          { id: '2', type: 'person', attributes: { name: 'Michael Coreleone' } },
        ],
      });
    };

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
      });
      store.push({ data: { type: 'person', id: '1', attributes: { name: 'Vito' } } });
      store.push({ data: { type: 'person', id: '2', attributes: { name: 'Michael' } } });
    });

    var personsReference = family.hasMany('persons');

    run(function () {
      personsReference.reload({ adapterOptions }).then(function (records) {
        assert.strictEqual(get(records, 'length'), 2);
        assert.strictEqual(records.at(0).name, 'Vito Coreleone');
        assert.strictEqual(records.at(1).name, 'Michael Coreleone');

        done();
      });
    });
  });

  test('reload() fetches link when remoteType is link', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const adapterOptions = { thing: 'one' };

    var count = 0;
    adapter.findHasMany = function (store, snapshot, link) {
      assert.strictEqual(snapshot.adapterOptions, adapterOptions, 'adapterOptions are passed in');
      count++;
      assert.strictEqual(link, '/families/1/persons');

      if (count === 1) {
        return resolve({
          data: [
            { id: '1', type: 'person', attributes: { name: 'Vito' } },
            { id: '2', type: 'person', attributes: { name: 'Michael' } },
          ],
        });
      } else {
        return resolve({
          data: [
            { id: '1', type: 'person', attributes: { name: 'Vito Coreleone' } },
            { id: '2', type: 'person', attributes: { name: 'Michael Coreleone' } },
          ],
        });
      }
    };

    var family;
    run(function () {
      family = store.push({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              links: { related: '/families/1/persons' },
            },
          },
        },
      });
    });

    var personsReference = family.hasMany('persons');
    assert.strictEqual(personsReference.remoteType(), 'link');

    run(function () {
      personsReference
        .load({ adapterOptions })
        .then(function () {
          return personsReference.reload({ adapterOptions });
        })
        .then(function (records) {
          assert.strictEqual(get(records, 'length'), 2);
          assert.strictEqual(records.at(0).name, 'Vito Coreleone');
          assert.strictEqual(records.at(1).name, 'Michael Coreleone');

          done();
        });
    });
  });

  test('push record with nested includes (async has-many), chained HasManyReference#value()', async function (assert) {
    assert.expect(3);
    let store = this.owner.lookup('service:store');

    let family = store.push({
      data: {
        type: 'family',
        id: '1',
        relationships: {
          persons: {
            data: [
              { type: 'person', id: '1' },
              { type: 'person', id: '2' },
            ],
          },
        },
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'James',
          },
          relationships: {
            family: {
              data: { type: 'family', id: '1' },
            },
            pets: {
              data: [
                { type: 'pet', id: '1' },
                { type: 'pet', id: '2' },
              ],
            },
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'John',
          },
          relationships: {
            family: {
              data: { type: 'family', id: '1' },
            },
            pets: {
              data: [
                { type: 'pet', id: '3' },
                { type: 'pet', id: '4' },
              ],
            },
          },
        },
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Stitchette',
          },
        },
        {
          type: 'pet',
          id: '2',
          attributes: {
            name: 'Frida',
          },
        },
        {
          type: 'pet',
          id: '3',
          attributes: {
            name: 'Noun',
          },
        },
        {
          type: 'pet',
          id: '4',
          attributes: {
            name: 'Puma',
          },
        },
      ],
    });

    let persons = family.hasMany('persons').value();
    assert.strictEqual(persons.length, 2);
    persons.forEach((person) => {
      let pets = person.hasMany('pets').value();
      assert.strictEqual(pets.length, 2);
    });
  });

  test('fetch record with nested includes (async has-many), chained HasManyReference#value', async function (assert) {
    assert.expect(3);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshots) {
      return resolve({
        data: {
          type: 'family',
          id: '1',
          relationships: {
            persons: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
              ],
            },
          },
        },
        included: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'James',
            },
            relationships: {
              family: {
                data: { type: 'family', id: '1' },
              },
              pets: {
                data: [
                  { type: 'pet', id: '1' },
                  { type: 'pet', id: '2' },
                ],
              },
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'John',
            },
            relationships: {
              family: {
                data: { type: 'family', id: '1' },
              },
              pets: {
                data: [
                  { type: 'pet', id: '3' },
                  { type: 'pet', id: '4' },
                ],
              },
            },
          },
          {
            type: 'pet',
            id: '1',
            attributes: {
              name: 'Stitchette',
            },
          },
          {
            type: 'pet',
            id: '2',
            attributes: {
              name: 'Frida',
            },
          },
          {
            type: 'pet',
            id: '3',
            attributes: {
              name: 'Noun',
            },
          },
          {
            type: 'pet',
            id: '4',
            attributes: {
              name: 'Puma',
            },
          },
        ],
      });
    };

    let family = await store.findRecord('family', '1');
    let persons = family.hasMany('persons').value();
    assert.strictEqual(persons.length, 2);
    persons.forEach((person) => {
      let pets = person.hasMany('pets').value();
      assert.strictEqual(pets.length, 2);
    });
  });
});
