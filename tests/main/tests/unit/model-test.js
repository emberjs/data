import { computed, get, observer, set } from '@ember/object';

import { module, test } from 'qunit';
import { reject, resolve } from 'rsvp';

import { gte } from 'ember-compatibility-helpers';
import { setupTest } from 'ember-qunit';

import { InvalidError } from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, attr as DSattr } from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/model - Model', function (hooks) {
  setupTest(hooks);
  let store, adapter;

  hooks.beforeEach(function () {
    let { owner } = this;

    class Person extends Model {
      @attr('string')
      name;
      @attr('boolean')
      isDrugAddict;
      @attr()
      isArchived;
    }

    owner.register('model:person', Person);
    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
      })
    );
    owner.register('serializer:-default', JSONAPISerializer);
    owner.register('serializer:application', class extends JSONAPISerializer {});

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  module('currentState', function () {
    test('supports pushedData in root.deleted.uncommitted', async function (assert) {
      let record = store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      record.deleteRecord();

      store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      assert.strictEqual(
        get(record, 'currentState.stateName'),
        'root.deleted.uncommitted',
        'record accepts pushedData is in root.deleted.uncommitted state'
      );
    });

    test('supports canonical updates via pushedData in root.deleted.saved', async function (assert) {
      adapter.deleteRecord = () => {
        return resolve({ data: null });
      };

      let record = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            isArchived: false,
          },
        },
      });

      record.deleteRecord();
      await record.save();

      let currentState = record.currentState;

      assert.strictEqual(currentState.stateName, 'root.deleted.saved', 'record is in a persisted deleted state');
      assert.true(get(record, 'isDeleted'));
      assert.notStrictEqual(
        store.peekRecord('person', '1'),
        null,
        'the deleted person is not removed from store (no unload called)'
      );

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            isArchived: true,
          },
        },
      });

      currentState = record.currentState;

      assert.strictEqual(currentState.stateName, 'root.deleted.saved', 'record is still in a persisted deleted state');
      assert.true(get(record, 'isDeleted'), 'The record is still deleted');
      assert.true(get(record, 'isArchived'), 'The record reflects the update to canonical state');
    });

    testInDebug('Does not support dirtying in root.deleted.saved', async function (assert) {
      adapter.deleteRecord = () => {
        return resolve({ data: null });
      };

      let record = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            isArchived: false,
          },
        },
      });

      record.deleteRecord();
      await record.save();

      let currentState = record.currentState;

      assert.strictEqual(currentState.stateName, 'root.deleted.saved', 'record is in a persisted deleted state');
      assert.true(get(record, 'isDeleted'));
      assert.notStrictEqual(
        store.peekRecord('person', '1'),
        null,
        'the deleted person is not removed from store (no unload called)'
      );

      assert.expectAssertion(
        () => {
          record.isArchived = true;
        },
        /Attempted to set 'isArchived' on the deleted record /,
        "Assertion does not leak the 'value'"
      );

      currentState = record.currentState;

      assert.strictEqual(currentState.stateName, 'root.deleted.saved', 'record is still in a persisted deleted state');
      assert.true(get(record, 'isDeleted'), 'The record is still deleted');
      assert.false(get(record, 'isArchived'), 'The record reflects canonical state');
    });

    test('currentState is accessible when the record is created', async function (assert) {
      let record = store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      assert.strictEqual(
        get(record, 'currentState.stateName'),
        'root.loaded.saved',
        'records pushed into the store start in the loaded state'
      );
    });
  });

  module('ID', function () {
    test('a record reports its unique id via the `id` property', async function (assert) {
      store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      let record = await store.findRecord('person', '1');

      assert.strictEqual(get(record, 'id'), '1', 'reports id as id by default');
    });

    test("a record's id is included in its toString representation", async function (assert) {
      let person = store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      assert.strictEqual(person.toString(), `<model::${person.constructor.modelName}:1>`, 'reports id in toString');
    });

    testInDebug('trying to use `id` as an attribute should raise', async function (assert) {
      class TestModel extends Model {
        @attr('number')
        id;
        @attr('string')
        name;
      }

      this.owner.register('model:test-model', TestModel);

      assert.expectAssertion(() => {
        let ModelClass = store.modelFor('test-model');
        get(ModelClass, 'attributes');
      }, /You may not set `id` as an attribute on your model/);

      assert.expectAssertion(() => {
        store.push({
          data: {
            id: '1',
            type: 'test-model',
            attributes: {
              id: 'foo',
              name: 'bar',
            },
          },
        });
      }, /You may not set 'id' as an attribute on your model/);
    });

    test(`a collision of a record's id with object function's name`, async function (assert) {
      // see https://github.com/emberjs/ember.js/issues/4792 for an explanation of this test
      //   and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch
      // this effectively tests that our identityMap does not choke on IDs that are method names
      // such as `watch` which is particularly problematic
      assert.expect(1);

      let hasWatchMethod = Object.prototype.watch;
      try {
        if (!hasWatchMethod) {
          Object.prototype.watch = function () {};
        }

        store.push({
          data: {
            type: 'person',
            id: 'watch',
          },
        });

        let record = await store.findRecord('person', 'watch');

        assert.strictEqual(get(record, 'id'), 'watch', 'record is successfully created and could be found by its id');
      } finally {
        if (!hasWatchMethod) {
          delete Object.prototype.watch;
        }
      }
    });

    test('can ask if record with a given id is loaded', async function (assert) {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Scumbag Dale',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Scumbag Katz',
            },
          },
          {
            type: 'person',
            id: '3',
            attributes: {
              name: 'Scumbag Bryn',
            },
          },
        ],
      });

      assert.notStrictEqual(store.peekRecord('person', '1'), null, 'should have person with id 1');
      assert.notStrictEqual(store.peekRecord('person', '1'), null, 'should have person with id 1');
      assert.strictEqual(store.peekRecord('person', '4'), null, 'should not have person with id 4');
      assert.strictEqual(store.peekRecord('person', '4'), null, 'should not have person with id 4');
    });

    test('setting the id during createRecord should correctly update the id', async function (assert) {
      let person = store.createRecord('person', { id: 'john' });

      assert.strictEqual(person.id, 'john', 'new id should be correctly set.');

      let record = store.peekRecord('person', 'john');

      assert.strictEqual(person, record, 'The cache has an entry for john');
    });

    test('setting the id after createRecord should correctly update the id', async function (assert) {
      let person = store.createRecord('person');

      assert.strictEqual(person.id, null, 'initial created model id should be null');

      person.set('id', 'john');

      assert.strictEqual(person.id, 'john', 'new id should be correctly set.');

      let record = store.peekRecord('person', 'john');

      assert.strictEqual(person, record, 'The cache has an entry for john');
    });

    testInDebug('mutating the id after createRecord but before save works', async function (assert) {
      let person = store.createRecord('person', { id: 'chris' });

      assert.strictEqual(person.id, 'chris', 'initial created model id should be null');

      try {
        person.set('id', 'john');
        assert.ok(false, 'we should have thrown an error during mutation');
      } catch (e) {
        assert.ok(true, 'we did throw');
      }

      let chris = store.peekRecord('person', 'chris');
      let john = store.peekRecord('person', 'john');

      assert.ok(chris === person, 'The cache still has an entry for chris');
      assert.ok(john === null, 'The cache has no entry for john');
    });

    test('updating the id with store.setRecordId should work correctly when the id property is watched', async function (assert) {
      const OddPerson = Model.extend({
        name: DSattr('string'),
        idComputed: computed('id', function () {
          return this.id;
        }),
      });
      this.owner.register('model:odd-person', OddPerson);

      let person = store.createRecord('odd-person');
      let oddId = person.idComputed;

      assert.strictEqual(oddId, null, 'initial computed get is null');
      // test .get access of id
      assert.strictEqual(person.id, null, 'initial created model id should be null');

      const identifier = recordIdentifierFor(person);
      store._instanceCache.setRecordId(identifier, 'john');

      oddId = person.idComputed;
      assert.strictEqual(oddId, 'john', 'computed get is correct');
      // test direct access of id
      assert.strictEqual(person.id, 'john', 'new id should be correctly set.');
    });

    test('an ID of 0 is allowed', async function (assert) {
      store.push({
        data: {
          type: 'person',
          id: '0', // explicit number 0 to make this as risky as possible
          attributes: {
            name: 'Tom Dale',
          },
        },
      });

      // we peek it instead of getting the return of push to make sure
      // we can locate it in the identity map
      let record = store.peekRecord('person', 0);

      assert.strictEqual(record.name, 'Tom Dale', 'found record with id 0');
    });
  });

  module('@attr()', function () {
    test('a Model does not require an attribute type', async function (assert) {
      class NativeTag extends Model {
        @attr()
        name;
      }
      const LegacyTag = Model.extend({
        name: DSattr(),
      });

      this.owner.register('model:native-tag', NativeTag);
      this.owner.register('model:legacy-tag', LegacyTag);

      let nativeTag = store.createRecord('native-tag', { name: 'test native' });
      let legacyTag = store.createRecord('legacy-tag', { name: 'test legacy' });

      assert.strictEqual(get(nativeTag, 'name'), 'test native', 'the value is persisted');
      assert.strictEqual(get(legacyTag, 'name'), 'test legacy', 'the value is persisted');
    });

    test('a Model can have a defaultValue without an attribute type', async function (assert) {
      class NativeTag extends Model {
        @attr({ defaultValue: 'unknown native tag' })
        name;
      }
      const LegacyTag = Model.extend({
        name: DSattr({ defaultValue: 'unknown legacy tag' }),
      });

      this.owner.register('model:native-tag', NativeTag);
      this.owner.register('model:legacy-tag', LegacyTag);

      let nativeTag = store.createRecord('native-tag');
      let legacyTag = store.createRecord('legacy-tag');

      assert.strictEqual(get(nativeTag, 'name'), 'unknown native tag', 'the default value is found');
      assert.strictEqual(get(legacyTag, 'name'), 'unknown legacy tag', 'the default value is found');
    });

    test('a defaultValue for an attribute can be a function', async function (assert) {
      class Tag extends Model {
        @attr('string', {
          defaultValue() {
            return 'le default value';
          },
        })
        createdAt;
      }
      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');
      assert.strictEqual(get(tag, 'createdAt'), 'le default value', 'the defaultValue function is evaluated');
    });

    test('a defaultValue function gets the record, options, and key', async function (assert) {
      assert.expect(2);
      class Tag extends Model {
        @attr('string', {
          defaultValue(record, options, key) {
            assert.deepEqual(record, undefined, 'the record is passed in properly');
            assert.strictEqual(key, undefined, 'the attribute being defaulted is passed in properly');
            return 'le default value';
          },
        })
        createdAt;
      }
      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');

      get(tag, 'createdAt');
    });

    testInDebug('We assert when defaultValue is a constant non-primitive instance', async function (assert) {
      class Tag extends Model {
        @attr({ defaultValue: [] })
        tagInfo;
      }
      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');

      assert.expectAssertion(() => {
        get(tag, 'tagInfo');
      }, /Non primitive defaultValues are not supported/);
    });
  });

  module('Attribute Transforms', function () {
    function converts(testName, type, provided, expected, options = {}) {
      test(testName, async function (assert) {
        let { owner } = this;
        class TestModel extends Model {
          @attr(type, options)
          name;
        }

        owner.register('model:model', TestModel);
        owner.register('serializer:model', JSONSerializer);
        store.push(store.normalize('model', { id: '1', name: provided }));
        store.push(store.normalize('model', { id: '2' }));

        let record = store.peekRecord('model', 1);

        assert.deepEqual(get(record, 'name'), expected, type + ' coerces ' + provided + ' to ' + expected);
      });
    }

    function convertsFromServer(testName, type, provided, expected) {
      test(testName, async function (assert) {
        let { owner } = this;
        class TestModel extends Model {
          @attr(type)
          name;
        }

        owner.register('model:model', TestModel);
        owner.register('serializer:model', JSONSerializer);

        let record = store.push(
          store.normalize('model', {
            id: '1',
            name: provided,
          })
        );

        assert.deepEqual(get(record, 'name'), expected, type + ' coerces ' + provided + ' to ' + expected);
      });
    }

    function convertsWhenSet(testName, type, provided, expected) {
      test(testName, async function (assert) {
        let { owner } = this;
        class TestModel extends Model {
          @attr(type)
          name;
        }

        owner.register('model:model', TestModel);
        owner.register('serializer:model', JSONSerializer);

        let record = store.push({
          data: {
            type: 'model',
            id: '2',
          },
        });

        set(record, 'name', provided);
        assert.deepEqual(record.serialize().name, expected, type + ' saves ' + provided + ' as ' + expected);
      });
    }

    module('String', function () {
      converts('string-to-string', 'string', 'Scumbag Tom', 'Scumbag Tom');
      converts('number-to-string', 'string', 1, '1');
      converts('empty-string-to-empty-string', 'string', '', '');
      converts('null-to-null', 'string', null, null);
    });

    module('Number', function () {
      converts('string-1-to-number-1', 'number', '1', 1);
      converts('string-0-to-number-0', 'number', '0', 0);
      converts('1-to-1', 'number', 1, 1);
      converts('0-to-0', 'number', 0, 0);
      converts('empty-string-to-null', 'number', '', null);
      converts('null-to-null', 'number', null, null);
      converts('boolean-true-to-1', 'number', true, 1);
      converts('boolean-false-to-0', 'number', false, 0);
    });

    module('Boolean', function () {
      converts('string-1-to-true', 'boolean', '1', true);
      converts('empty-string-to-false', 'boolean', '', false);
      converts('number-1-to-true', 'boolean', 1, true);
      converts('number-0-to-false', 'boolean', 0, false);

      converts('null-to-null { allowNull: true }', 'boolean', null, null, { allowNull: true });
      converts('null-to-false { allowNull: false }', 'boolean', null, false, { allowNull: false });
      converts('null-to-false', 'boolean', null, false);

      converts('boolean-true-to-true', 'boolean', true, true);
      converts('boolean-false-to-false', 'boolean', false, false);
    });

    module('Date', function () {
      converts('null-to-null', 'date', null, null);
      converts('undefined-to-undefined', 'date', undefined, undefined);

      let dateString = '2011-12-31T00:08:16.000Z';
      let date = new Date(dateString);

      convertsFromServer('string-to-Date', 'date', dateString, date);
      convertsWhenSet('Date-to-string', 'date', date, dateString);
    });
  });

  module('Reserved Props', function () {
    testInDebug(`don't allow setting of readOnly state props`, async function (assert) {
      let record = store.createRecord('person');

      assert.expectAssertion(() => {
        record.set('isLoaded', true);
      }, /Cannot set property isLoaded of \[object Object\] which has only a getter/);
    });

    class NativePostWithCurrentState extends Model {
      @attr('string')
      currentState;
      @attr('string')
      name;
    }
    const PROP_MAP = {
      currentState: NativePostWithCurrentState,
    };

    function testReservedProperty(prop) {
      let testName = `A subclass of Model cannot use the reserved property '${prop}'`;

      testInDebug(testName, async function (assert) {
        const NativePost = PROP_MAP[prop];
        const LegacyPost = Model.extend({
          [prop]: DSattr('string'),
          name: DSattr('string'),
        });
        this.owner.register('model:native-post', NativePost);
        this.owner.register('model:legacy-post', LegacyPost);

        const msg = `'${prop}' is a reserved property name on instances of classes extending Model.`;

        assert.throws(
          () => {
            store.createRecord('native-post', { name: 'TomHuda' });
          },
          function (e) {
            return e.message.indexOf(msg) === 0;
          },
          'We throw for native-style classes'
        );

        assert.throws(
          () => {
            store.createRecord('legacy-post', { name: 'TomHuda' });
          },
          function (e) {
            return e.message.indexOf(msg) === 0;
          },
          'We throw for legacy-style classes'
        );
      });
    }

    ['currentState'].forEach(testReservedProperty);

    testInDebug('A subclass of Model throws an error when calling create() directly', async function (assert) {
      class NativePerson extends Model {}
      const LegacyPerson = Model.extend({});

      assert.throws(
        () => {
          NativePerson.create();
        },
        /You should not call `create` on a model/,
        'Throws an error when calling create() on model'
      );

      assert.throws(
        () => {
          LegacyPerson.create();
        },
        /You should not call `create` on a model/,
        'Throws an error when calling create() on model'
      );
    });
  });

  module('init()', function () {
    test('ensure model exits loading state, materializes data and fulfills promise only after data is available', async function (assert) {
      assert.expect(2);
      adapter.findRecord = () =>
        resolve({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'John' },
          },
        });

      let person = await store.findRecord('person', 1);

      assert.strictEqual(get(person, 'currentState.stateName'), 'root.loaded.saved', 'model is in loaded state');
      assert.true(get(person, 'isLoaded'), 'model is loaded');
    });

    test('Pushing a record into the store should transition new records to the loaded state', async function (assert) {
      let person = store.createRecord('person', { id: '1', name: 'TomHuda' });

      assert.true(person.isNew, 'createRecord should put records into the new state');

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'TomHuda',
          },
        },
      });

      assert.false(person.isNew, 'push should put move the record into the loaded state');
      assert.strictEqual(person.currentState.stateName, 'root.loaded.saved', 'model is in loaded state');
    });

    test('record properties can be set during `init`', async function (assert) {
      let nameDidChange = 0;

      class OddNativePerson extends Model {
        @attr('string')
        name;
        init() {
          super.init(...arguments);
          this.set('name', 'my-name-set-in-init');
        }
      }
      const OddLegacyPerson = Model.extend({
        name: DSattr('string'),

        init() {
          this._super(...arguments);
          this.set('name', 'my-name-set-in-init');
        },

        nameDidChange: observer('name', () => nameDidChange++),
      });
      this.owner.register('model:native-person', OddNativePerson);
      this.owner.register('model:legacy-person', OddLegacyPerson);

      assert.strictEqual(nameDidChange, 0, 'observer should not trigger on create');
      let person = store.createRecord('legacy-person');
      assert.strictEqual(nameDidChange, 0, 'observer should not trigger on create');
      assert.strictEqual(person.name, 'my-name-set-in-init');

      person = store.createRecord('native-person');
      assert.strictEqual(person.name, 'my-name-set-in-init');
    });

    test('accessing attributes during init should not throw an error', async function (assert) {
      const Person = Model.extend({
        name: DSattr('string'),

        init() {
          this._super(...arguments);
          assert.strictEqual(this.name, 'bam!', 'We all good here');
        },
      });
      this.owner.register('model:odd-person', Person);

      store.createRecord('odd-person', { name: 'bam!' });
    });
  });

  module('Updating', function () {
    test('a Model can update its attributes', async function (assert) {
      assert.expect(1);

      let person = store.push({
        data: {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
      });

      set(person, 'name', 'Brohuda Katz');
      assert.strictEqual(get(person, 'name'), 'Brohuda Katz', 'setting took hold');
    });

    test(`clearing the value when a Model's defaultValue was in use works`, async function (assert) {
      class Tag extends Model {
        @attr('string', { defaultValue: 'unknown' })
        name;
      }

      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');
      assert.strictEqual(get(tag, 'name'), 'unknown', 'the default value is found');

      set(tag, 'name', null);
      assert.strictEqual(get(tag, 'name'), null, `null doesn't shadow defaultValue`);
    });

    test(`a Model can define 'setUnknownProperty'`, async function (assert) {
      class NativeTag extends Model {
        @attr('string')
        name;

        setUnknownProperty(key, value) {
          if (key === 'title') {
            this.set('name', value);
          }
        }
      }
      const LegacyTag = Model.extend({
        name: DSattr('string'),

        setUnknownProperty(key, value) {
          if (key === 'title') {
            this.set('name', value);
          }
        },
      });
      this.owner.register('model:native-tag', NativeTag);
      this.owner.register('model:legacy-tag', LegacyTag);

      let legacyTag = store.createRecord('legacy-tag', { name: 'old' });
      assert.strictEqual(get(legacyTag, 'name'), 'old', 'precond - name is correct');

      set(legacyTag, 'name', 'edited');
      assert.strictEqual(get(legacyTag, 'name'), 'edited', 'setUnknownProperty was not triggered');

      set(legacyTag, 'title', 'new');
      assert.strictEqual(get(legacyTag, 'name'), 'new', 'setUnknownProperty was triggered');

      let nativeTag = store.createRecord('native-tag', { name: 'old' });
      assert.strictEqual(get(nativeTag, 'name'), 'old', 'precond - name is correct');

      set(nativeTag, 'name', 'edited');
      assert.strictEqual(get(nativeTag, 'name'), 'edited', 'setUnknownProperty was not triggered');

      set(nativeTag, 'title', 'new');
      assert.strictEqual(get(nativeTag, 'name'), 'new', 'setUnknownProperty was triggered');
    });

    test('setting a property to undefined on a newly created record should not impact the current state', async function (assert) {
      class Tag extends Model {
        @attr('string')
        tagInfo;
      }
      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');

      set(tag, 'name', 'testing');

      assert.strictEqual(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');

      set(tag, 'name', undefined);

      assert.strictEqual(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');

      tag = store.createRecord('tag', { name: undefined });

      assert.strictEqual(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');
    });

    test('setting a property back to its original value cleans the mutated state', async function (assert) {
      let person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
      });

      assert.strictEqual(person.name, 'Scumbag Dale', 'name is correct');
      assert.false(person.hasDirtyAttributes, 'name is clean');

      set(person, 'name', 'Niceguy Dale');

      assert.strictEqual(person.name, 'Niceguy Dale', 'dirtied name is correct');
      assert.true(person.hasDirtyAttributes, 'name is dirty');

      set(person, 'name', 'Scumbag Dale');

      assert.strictEqual(person.name, 'Scumbag Dale', 'name is correct');
      assert.false(person.hasDirtyAttributes, 'name is clean');
    });
  });

  module('Mutation', function () {
    test('can have properties and non-specified properties set on it', async function (assert) {
      let record = store.createRecord('person', { isDrugAddict: false, notAnAttr: 'my value' });
      set(record, 'name', 'bar');
      set(record, 'anotherNotAnAttr', 'my other value');

      assert.strictEqual(get(record, 'notAnAttr'), 'my value', 'property was set on the record');
      assert.strictEqual(get(record, 'anotherNotAnAttr'), 'my other value', 'property was set on the record');
      assert.false(get(record, 'isDrugAddict'), 'property was set on the record');
      assert.strictEqual(get(record, 'name'), 'bar', 'property was set on the record');
    });

    test('setting a property on a record that has not changed does not cause it to become dirty', async function (assert) {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true,
          },
        },
      });

      let person = await store.findRecord('person', '1');

      assert.false(person.hasDirtyAttributes, 'precond - person record should not be dirty');

      person.set('name', 'Peter');
      person.set('isDrugAddict', true);

      assert.false(person.hasDirtyAttributes, 'record does not become dirty after setting property to old value');
    });

    test('resetting a property on a record cause it to become clean again', async function (assert) {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true,
          },
        },
      });

      let person = await store.findRecord('person', '1');

      assert.false(person.hasDirtyAttributes, 'precond - person record should not be dirty');

      person.set('isDrugAddict', false);

      assert.true(person.hasDirtyAttributes, 'record becomes dirty after setting property to a new value');

      person.set('isDrugAddict', true);

      assert.false(person.hasDirtyAttributes, 'record becomes clean after resetting property to the old value');
    });

    test('resetting a property to the current in-flight value causes it to become clean when the save completes', async function (assert) {
      adapter.updateRecord = function () {
        return resolve();
      };

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom',
          },
        },
      });

      let person = store.peekRecord('person', 1);
      person.set('name', 'Thomas');

      let saving = person.save();

      assert.strictEqual(person.name, 'Thomas');

      person.set('name', 'Tomathy');
      assert.strictEqual(person.name, 'Tomathy');

      person.set('name', 'Thomas');
      assert.strictEqual(person.name, 'Thomas');

      await saving;

      assert.false(person.hasDirtyAttributes, 'The person is now clean');
    });

    test('a record becomes clean again only if all changed properties are reset', async function (assert) {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true,
          },
        },
      });

      let person = await store.findRecord('person', 1);

      assert.false(person.hasDirtyAttributes, 'precond - person record should not be dirty');
      person.set('isDrugAddict', false);
      assert.true(person.hasDirtyAttributes, 'record becomes dirty after setting one property to a new value');
      person.set('name', 'Mark');
      assert.true(person.hasDirtyAttributes, 'record stays dirty after setting another property to a new value');
      person.set('isDrugAddict', true);
      assert.true(person.hasDirtyAttributes, 'record stays dirty after resetting only one property to the old value');
      person.set('name', 'Peter');
      assert.false(person.hasDirtyAttributes, 'record becomes clean after resetting both properties to the old value');
    });

    test('an invalid record becomes clean again if changed property is reset', async function (assert) {
      adapter.updateRecord = () => {
        return reject(
          new InvalidError([
            {
              source: {
                pointer: '/data/attributes/name',
              },
            },
          ])
        );
      };

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true,
          },
        },
      });

      let person = store.peekRecord('person', 1);

      assert.false(person.hasDirtyAttributes, 'precond - person record should not be dirty');
      person.set('name', 'Wolf');
      assert.true(person.hasDirtyAttributes, 'record becomes dirty after setting one property to a new value');

      await person
        .save()
        .then(() => {
          assert.ok(false, 'We should reject the save');
        })
        .catch(() => {
          assert.false(person.isValid, 'record is not valid');
          assert.true(person.hasDirtyAttributes, 'record still has dirty attributes');
          assert.strictEqual(person.errors.get('name')[0].message, 'Invalid Attribute');

          person.set('name', 'Peter');

          assert.true(person.isValid, 'record is valid after resetting attribute to old value');
          assert.false(person.hasDirtyAttributes, 'record becomes clean after resetting property to the old value');
          assert.strictEqual(person.errors.length, 0, 'no errors remain');
        });
    });

    test('an invalid record stays dirty if only invalid property is reset', async function (assert) {
      adapter.updateRecord = () => {
        return reject(
          new InvalidError([
            {
              source: {
                pointer: '/data/attributes/name',
              },
            },
          ])
        );
      };

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true,
          },
        },
      });

      let person = store.peekRecord('person', 1);

      assert.false(person.hasDirtyAttributes, 'precond - person record should not be dirty');
      person.set('name', 'Wolf');
      person.set('isDrugAddict', false);
      assert.true(person.hasDirtyAttributes, 'record becomes dirty after setting one property to a new value');

      await person
        .save()
        .then(() => {
          assert.ok(false, 'save should have rejected');
        })
        .catch(() => {
          assert.false(person.isValid, 'record is not valid');
          assert.true(person.hasDirtyAttributes, 'record still has dirty attributes');
          assert.strictEqual(person.errors.get('name')[0].message, 'Invalid Attribute');

          person.set('name', 'Peter');

          assert.true(person.isValid, 'record is valid after resetting invalid attribute to old value');
          assert.true(person.hasDirtyAttributes, 'record still has dirty attributes');
          assert.strictEqual(person.errors.length, 0, 'no errors remain');
        });
    });

    test('it should cache attributes', async function (assert) {
      class Post extends Model {
        @attr('string')
        updatedAt;
      }
      this.owner.register('model:post', Post);

      let dateString = 'Sat, 31 Dec 2011 00:08:16 GMT';
      let date = new Date(dateString);

      store.push({
        data: {
          type: 'post',
          id: '1',
        },
      });

      let record = await store.findRecord('post', '1');

      record.set('updatedAt', date);

      assert.deepEqual(date, get(record, 'updatedAt'), 'setting a date returns the same date');
      assert.strictEqual(
        get(record, 'updatedAt'),
        get(record, 'updatedAt'),
        'second get still returns the same object'
      );
    });

    test('changedAttributes() return correct values', async function (assert) {
      class Mascot extends Model {
        @attr('string')
        name;
        @attr('string')
        likes;
        @attr('boolean')
        isMascot;
      }

      this.owner.register('model:mascot', Mascot);

      let mascot = store.push({
        data: {
          type: 'mascot',
          id: '1',
          attributes: {
            likes: 'JavaScript',
            isMascot: true,
          },
        },
      });

      assert.strictEqual(Object.keys(mascot.changedAttributes()).length, 0, 'there are no initial changes');

      mascot.set('name', 'Tomster'); // new value
      mascot.set('likes', 'Ember.js'); // changed value
      mascot.set('isMascot', true); // same value

      let changedAttributes = mascot.changedAttributes();

      assert.deepEqual(changedAttributes.name, [undefined, 'Tomster']);
      assert.deepEqual(changedAttributes.likes, ['JavaScript', 'Ember.js']);

      mascot.rollbackAttributes();

      assert.strictEqual(
        Object.keys(mascot.changedAttributes()).length,
        0,
        'after rollback attributes there are no changes'
      );
    });

    test('changedAttributes() works while the record is being saved', async function (assert) {
      assert.expect(1);
      class Mascot extends Model {
        @attr('string')
        name;
        @attr('string')
        likes;
        @attr('boolean')
        isMascot;
      }

      this.owner.register('model:mascot', Mascot);
      adapter.createRecord = function () {
        assert.deepEqual(cat.changedAttributes(), {
          name: [undefined, 'Argon'],
          likes: [undefined, 'Cheese'],
        });

        return resolve({ data: { id: '1', type: 'mascot' } });
      };

      let cat;

      cat = store.createRecord('mascot');
      cat.setProperties({
        name: 'Argon',
        likes: 'Cheese',
      });

      await cat.save();
    });

    test('changedAttributes() works while the record is being updated', async function (assert) {
      assert.expect(1);
      let cat;

      class Mascot extends Model {
        @attr('string')
        name;
        @attr('string')
        likes;
        @attr('boolean')
        isMascot;
      }

      this.owner.register('model:mascot', Mascot);
      adapter.updateRecord = function () {
        assert.deepEqual(cat.changedAttributes(), {
          name: ['Argon', 'Helia'],
          likes: ['Cheese', 'Mussels'],
        });

        return { data: { id: '1', type: 'mascot' } };
      };

      cat = store.push({
        data: {
          type: 'mascot',
          id: '1',
          attributes: {
            name: 'Argon',
            likes: 'Cheese',
          },
        },
      });

      cat.setProperties({
        name: 'Helia',
        likes: 'Mussels',
      });

      await cat.save();
    });

    test('changedAttributes() reset after save', async function (assert) {
      adapter.updateRecord = function (store, type, snapshot) {
        return resolve({
          data: {
            id: '1',
            type: 'person',
            attributes: {
              name: snapshot.attr('name'),
            },
          },
        });
      };

      const originalName = 'the original name';
      const newName = 'a new name';

      const person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: originalName,
          },
        },
      });

      person.name = newName;

      assert.deepEqual(
        person.changedAttributes().name,
        [originalName, newName],
        'changedAttributes() reports old/new values before save'
      );

      await person.save();

      const changes = person.changedAttributes();
      assert.deepEqual(changes, {}, 'changedAttributes() reset after save');
    });

    if (gte('3.10.0')) {
      test('@attr decorator works without parens', async function (assert) {
        assert.expect(1);
        let cat;

        class Mascot extends Model {
          @attr name;
        }

        this.owner.register('model:mascot', Mascot);
        adapter.updateRecord = function () {
          assert.deepEqual(cat.changedAttributes(), {
            name: ['Argon', 'Helia'],
          });

          return { data: { id: '1', type: 'mascot' } };
        };

        cat = store.push({
          data: {
            type: 'mascot',
            id: '1',
            attributes: {
              name: 'Argon',
            },
          },
        });

        cat.setProperties({
          name: 'Helia',
        });

        await cat.save();
      });
    }
  });

  module('Misc', function () {
    testInDebug('Calling record.attr() asserts', async function (assert) {
      let person = store.createRecord('person', { id: '1', name: 'TomHuda' });

      assert.expectAssertion(() => {
        person.attr();
      }, /Assertion Failed: The `attr` method is not available on Model, a Snapshot was probably expected\. Are you passing a Model instead of a Snapshot to your serializer\?/);
    });
  });
});
