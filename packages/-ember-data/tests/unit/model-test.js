import { guidFor } from '@ember/object/internals';
import { resolve, reject } from 'rsvp';
import { set, get, observer, computed } from '@ember/object';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';
import { deprecatedTest } from 'dummy/tests/helpers/deprecated-test';
import { settled } from '@ember/test-helpers';
import { setupTest } from 'ember-qunit';
import Model from '@ember-data/model';
import { InvalidError } from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import JSONSerializer from '@ember-data/serializer/json';
import { attr as DSattr } from '@ember-data/model';
import { recordDataFor } from '@ember-data/store/-private';
import { attr, hasMany, belongsTo } from '@ember-data/model';
import { gte } from 'ember-compatibility-helpers';

module('unit/model - Model', function(hooks) {
  setupTest(hooks);
  let store, adapter;

  hooks.beforeEach(function() {
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
    owner.register('serializer:application', JSONAPISerializer.extend());

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  module('currentState', function() {
    test('supports pushedData in root.deleted.uncommitted', async function(assert) {
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

      assert.equal(
        get(record, 'currentState.stateName'),
        'root.deleted.uncommitted',
        'record accepts pushedData is in root.deleted.uncommitted state'
      );
    });

    test('supports canonical updates via pushedData in root.deleted.saved', async function(assert) {
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

      await record.destroyRecord();

      let currentState = record._internalModel.currentState;

      assert.ok(currentState.stateName === 'root.deleted.saved', 'record is in a persisted deleted state');
      assert.equal(get(record, 'isDeleted'), true);
      assert.ok(
        store.peekRecord('person', '1') !== null,
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

      currentState = record._internalModel.currentState;

      assert.ok(currentState.stateName === 'root.deleted.saved', 'record is still in a persisted deleted state');
      assert.ok(get(record, 'isDeleted') === true, 'The record is still deleted');
      assert.ok(get(record, 'isArchived') === true, 'The record reflects the update to canonical state');
    });

    test('Does not support dirtying in root.deleted.saved', async function(assert) {
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

      await record.destroyRecord();

      let currentState = record._internalModel.currentState;

      assert.ok(currentState.stateName === 'root.deleted.saved', 'record is in a persisted deleted state');
      assert.equal(get(record, 'isDeleted'), true);
      assert.ok(
        store.peekRecord('person', '1') !== null,
        'the deleted person is not removed from store (no unload called)'
      );

      assert.expectAssertion(() => {
        set(record, 'isArchived', true);
      }, /Attempted to set 'isArchived' to 'true' on the deleted record <person:1>/);

      currentState = record._internalModel.currentState;

      assert.ok(currentState.stateName === 'root.deleted.saved', 'record is still in a persisted deleted state');
      assert.ok(get(record, 'isDeleted') === true, 'The record is still deleted');
      assert.ok(get(record, 'isArchived') === false, 'The record reflects canonical state');
    });

    test('currentState is accessible when the record is created', async function(assert) {
      let record = store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      assert.equal(
        get(record, 'currentState.stateName'),
        'root.loaded.saved',
        'records pushed into the store start in the loaded state'
      );
    });
  });

  module('ID', function() {
    test('a record reports its unique id via the `id` property', async function(assert) {
      store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      let record = await store.findRecord('person', '1');

      assert.equal(get(record, 'id'), 1, 'reports id as id by default');
    });

    test("a record's id is included in its toString representation", async function(assert) {
      let person = store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      assert.equal(
        person.toString(),
        `<dummy@model:${person.constructor.modelName}::${guidFor(person)}:1>`,
        'reports id in toString'
      );
    });

    testInDebug('trying to use `id` as an attribute should raise', async function(assert) {
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

    test(`a collision of a record's id with object function's name`, async function(assert) {
      // see https://github.com/emberjs/ember.js/issues/4792 for an explanation of this test
      //   and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch
      // this effectively tests that our identityMap does not choke on IDs that are method names
      // such as `watch` which is particularly problematic
      assert.expect(1);

      let hasWatchMethod = Object.prototype.watch;
      try {
        if (!hasWatchMethod) {
          Object.prototype.watch = function() {};
        }

        store.push({
          data: {
            type: 'person',
            id: 'watch',
          },
        });

        let record = await store.findRecord('person', 'watch');

        assert.equal(get(record, 'id'), 'watch', 'record is successfully created and could be found by its id');
      } finally {
        if (!hasWatchMethod) {
          delete Object.prototype.watch;
        }
      }
    });

    test('can ask if record with a given id is loaded', async function(assert) {
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

      assert.equal(store.hasRecordForId('person', 1), true, 'should have person with id 1');
      assert.equal(store.hasRecordForId('person', 1), true, 'should have person with id 1');
      assert.equal(store.hasRecordForId('person', 4), false, 'should not have person with id 4');
      assert.equal(store.hasRecordForId('person', 4), false, 'should not have person with id 4');
    });

    test('setting the id during createRecord should correctly update the id', async function(assert) {
      let person = store.createRecord('person', { id: 'john' });

      assert.equal(person.get('id'), 'john', 'new id should be correctly set.');

      let record = store.peekRecord('person', 'john');

      assert.ok(person === record, 'The cache has an entry for john');
    });

    test('setting the id after createRecord should correctly update the id', async function(assert) {
      let person = store.createRecord('person');

      assert.equal(person.get('id'), null, 'initial created model id should be null');

      person.set('id', 'john');

      assert.equal(person.get('id'), 'john', 'new id should be correctly set.');

      let record = store.peekRecord('person', 'john');

      assert.ok(person === record, 'The cache has an entry for john');
    });

    testInDebug('mutating the id after createRecord but before save works', async function(assert) {
      let person = store.createRecord('person', { id: 'chris' });

      assert.equal(person.get('id'), 'chris', 'initial created model id should be null');

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

    test('updating the id with store.setRecordId should work correctly when the id property is watched', async function(assert) {
      const OddPerson = Model.extend({
        name: DSattr('string'),
        idComputed: computed('id', function() {
          return this.get('id');
        }),
      });
      this.owner.register('model:odd-person', OddPerson);

      let person = store.createRecord('odd-person');
      let oddId = person.get('idComputed');

      assert.equal(oddId, null, 'initial computed get is null');
      // test .get access of id
      assert.equal(person.get('id'), null, 'initial created model id should be null');

      store.setRecordId('odd-person', 'john', person._internalModel.clientId);

      oddId = person.get('idComputed');
      assert.equal(oddId, 'john', 'computed get is correct');
      // test direct access of id
      assert.equal(person.id, 'john', 'new id should be correctly set.');
    });

    test('ID mutation (complicated)', async function(assert) {
      let idChange = 0;
      const OddPerson = Model.extend({
        name: DSattr('string'),
        idComputed: computed('id', function() {}),
        idDidChange: observer('id', () => idChange++),
      });
      this.owner.register('model:odd-person', OddPerson);

      let person = store.createRecord('odd-person');
      person.get('idComputed');
      assert.equal(idChange, 0);

      assert.equal(person.get('id'), null, 'initial created model id should be null');
      assert.equal(idChange, 0);
      person._internalModel.setId('john');
      assert.equal(idChange, 1);
      assert.equal(person.get('id'), 'john', 'new id should be correctly set.');
    });

    test('an ID of 0 is allowed', async function(assert) {
      store.push({
        data: {
          type: 'person',
          id: 0, // explicit number 0 to make this as risky as possible
          attributes: {
            name: 'Tom Dale',
          },
        },
      });

      // we peek it instead of getting the return of push to make sure
      // we can locate it in the identity map
      let record = store.peekRecord('person', 0);

      assert.equal(record.get('name'), 'Tom Dale', 'found record with id 0');
    });
  });

  module('@attr()', function() {
    test('a Model does not require an attribute type', async function(assert) {
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

      assert.equal(get(nativeTag, 'name'), 'test native', 'the value is persisted');
      assert.equal(get(legacyTag, 'name'), 'test legacy', 'the value is persisted');
    });

    test('a Model can have a defaultValue without an attribute type', async function(assert) {
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

      assert.equal(get(nativeTag, 'name'), 'unknown native tag', 'the default value is found');
      assert.equal(get(legacyTag, 'name'), 'unknown legacy tag', 'the default value is found');
    });

    test('a defaultValue for an attribute can be a function', async function(assert) {
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
      assert.equal(get(tag, 'createdAt'), 'le default value', 'the defaultValue function is evaluated');
    });

    test('a defaultValue function gets the record, options, and key', async function(assert) {
      assert.expect(2);
      class Tag extends Model {
        @attr('string', {
          defaultValue(record, options, key) {
            assert.deepEqual(record, tag, 'the record is passed in properly');
            assert.equal(key, 'createdAt', 'the attribute being defaulted is passed in properly');
            return 'le default value';
          },
        })
        createdAt;
      }
      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');

      get(tag, 'createdAt');
    });

    testInDebug('We assert when defaultValue is a constant non-primitive instance', async function(assert) {
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

  module('Attribute Transforms', function() {
    function converts(testName, type, provided, expected, options = {}) {
      test(testName, async function(assert) {
        let { owner } = this;
        class TestModel extends Model {
          @attr(type, options)
          name;
        }

        owner.register('model:model', TestModel);
        owner.register('serializer:model', JSONSerializer);
        store.push(store.normalize('model', { id: 1, name: provided }));
        store.push(store.normalize('model', { id: 2 }));

        let record = store.peekRecord('model', 1);

        assert.deepEqual(get(record, 'name'), expected, type + ' coerces ' + provided + ' to ' + expected);
      });
    }

    function convertsFromServer(testName, type, provided, expected) {
      test(testName, async function(assert) {
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
      test(testName, async function(assert) {
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

    module('String', function() {
      converts('string-to-string', 'string', 'Scumbag Tom', 'Scumbag Tom');
      converts('number-to-string', 'string', 1, '1');
      converts('empty-string-to-empty-string', 'string', '', '');
      converts('null-to-null', 'string', null, null);
    });

    module('Number', function() {
      converts('string-1-to-number-1', 'number', '1', 1);
      converts('string-0-to-number-0', 'number', '0', 0);
      converts('1-to-1', 'number', 1, 1);
      converts('0-to-0', 'number', 0, 0);
      converts('empty-string-to-null', 'number', '', null);
      converts('null-to-null', 'number', null, null);
      converts('boolean-true-to-1', 'number', true, 1);
      converts('boolean-false-to-0', 'number', false, 0);
    });

    module('Boolean', function() {
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

    module('Date', function() {
      converts('null-to-null', 'date', null, null);
      converts('undefined-to-undefined', 'date', undefined, undefined);

      let dateString = '2011-12-31T00:08:16.000Z';
      let date = new Date(dateString);

      convertsFromServer('string-to-Date', 'date', dateString, date);
      convertsWhenSet('Date-to-string', 'date', date, dateString);
    });
  });

  module('Evented', function() {
    deprecatedTest(
      'an event listener can be added to a record',
      {
        id: 'ember-data:evented-api-usage',
        count: 1,
        until: '4.0',
      },
      async function(assert) {
        let count = 0;
        let F = function() {
          count++;
        };

        let record = store.createRecord('person');

        record.on('event!', F);

        record.trigger('event!');

        await settled();

        assert.equal(count, 1, 'the event was triggered');

        record.trigger('event!');

        await settled();

        assert.equal(count, 2, 'the event was triggered');
      }
    );

    deprecatedTest(
      'when an event is triggered on a record the method with the same name is invoked with arguments',
      {
        id: 'ember-data:evented-api-usage',
        count: 0,
        until: '4.0',
      },
      async function(assert) {
        let count = 0;
        let F = function() {
          count++;
        };
        let record = store.createRecord('person');

        record.eventNamedMethod = F;

        record.trigger('eventNamedMethod');

        await settled();

        assert.equal(count, 1, 'the corresponding method was called');
      }
    );

    deprecatedTest(
      'when a method is invoked from an event with the same name the arguments are passed through',
      {
        id: 'ember-data:evented-api-usage',
        count: 0,
        until: '4.0',
      },
      async function(assert) {
        let eventMethodArgs = null;
        let F = function() {
          eventMethodArgs = arguments;
        };
        let record = store.createRecord('person');

        record.eventThatTriggersMethod = F;
        record.trigger('eventThatTriggersMethod', 1, 2);

        await settled();

        assert.equal(eventMethodArgs[0], 1);
        assert.equal(eventMethodArgs[1], 2);
      }
    );

    testInDebug('defining record lifecycle event methods on a model class is deprecated', async function(assert) {
      class EngineerModel extends Model {
        becameError() {}
        becameInvalid() {}
        didCreate() {}
        didDelete() {}
        didLoad() {}
        didUpdate() {}
        ready() {}
        rolledBack() {}
      }

      this.owner.register('model:engineer', EngineerModel);

      let store = this.owner.lookup('service:store');

      store.createRecord('engineer');

      assert.expectDeprecation(/You defined a `becameError` method for model:engineer but lifecycle events/);
      assert.expectDeprecation(/You defined a `becameInvalid` method for model:engineer but lifecycle events/);
      assert.expectDeprecation(/You defined a `didCreate` method for model:engineer but lifecycle events/);
      assert.expectDeprecation(/You defined a `didDelete` method for model:engineer but lifecycle events/);
      assert.expectDeprecation(/You defined a `didLoad` method for model:engineer but lifecycle events/);
      assert.expectDeprecation(/You defined a `didUpdate` method for model:engineer but lifecycle events/);
      assert.expectDeprecation(/You defined a `ready` method for model:engineer but lifecycle events/);
      assert.expectDeprecation(/You defined a `rolledBack` method for model:engineer but lifecycle events/);
    });
  });

  module('Reserved Props', function() {
    testInDebug(`don't allow setting of readOnly state props`, async function(assert) {
      let record = store.createRecord('person');

      assert.expectAssertion(() => {
        record.set('isLoaded', true);
      }, /Cannot set read-only property "isLoaded"/);
    });

    class NativePostWithInternalModel extends Model {
      @attr('string')
      _internalModel;
      @attr('string')
      name;
    }
    class NativePostWithCurrentState extends Model {
      @attr('string')
      currentState;
      @attr('string')
      name;
    }
    const PROP_MAP = {
      _internalModel: NativePostWithInternalModel,
      currentState: NativePostWithCurrentState,
    };

    function testReservedProperty(prop) {
      let testName = `A subclass of Model cannot use the reserved property '${prop}'`;

      testInDebug(testName, async function(assert) {
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
          function(e) {
            return e.message.indexOf(msg) === 0;
          },
          'We throw for native-style classes'
        );

        assert.throws(
          () => {
            store.createRecord('legacy-post', { name: 'TomHuda' });
          },
          function(e) {
            return e.message.indexOf(msg) === 0;
          },
          'We throw for legacy-style classes'
        );
      });
    }

    ['_internalModel', 'currentState'].forEach(testReservedProperty);

    testInDebug('A subclass of Model throws an error when calling create() directly', async function(assert) {
      class NativePerson extends Model {}
      const LegacyPerson = Model.extend({});
      const EmberObjectNewError = 'was not instantiated correctly.';

      assert.throws(
        () => {
          NativePerson.create();
        },
        /You should not call `create` on a model/,
        'Throws an error when calling create() on model'
      );

      assert.throws(
        () => {
          try {
            // the `{}` here is so that in recent ember we throw a nice error vs an
            // obtuse error. An error will thrown in any case though.
            new NativePerson({});
          } catch (e) {
            if (e.message.indexOf(EmberObjectNewError) !== -1) {
              throw new Error('You should not call `create` on a model');
            }
            throw e;
          }
        },
        /You should not call `create` on a model/,
        'Throws an error when calling instantiating via new Model'
      );

      assert.throws(
        () => {
          LegacyPerson.create();
        },
        /You should not call `create` on a model/,
        'Throws an error when calling create() on model'
      );

      assert.throws(
        () => {
          try {
            // the `{}` here is so that in recent ember we throw a nice error vs an
            // obtuse error. An error will thrown in any case though.
            new LegacyPerson({});
          } catch (e) {
            if (e.message.indexOf(EmberObjectNewError) !== -1) {
              throw new Error('You should not call `create` on a model');
            }
            throw e;
          }
        },
        /You should not call `create` on a model/,
        'Throws an error when calling instantiating view new Model()'
      );
    });
  });

  module('init()', function() {
    test('ensure model exits loading state, materializes data and fulfills promise only after data is available', async function(assert) {
      assert.expect(2);
      adapter.findRecord = () =>
        resolve({
          data: {
            id: 1,
            type: 'person',
            attributes: { name: 'John' },
          },
        });

      let person = await store.findRecord('person', 1);

      assert.equal(get(person, 'currentState.stateName'), 'root.loaded.saved', 'model is in loaded state');
      assert.equal(get(person, 'isLoaded'), true, 'model is loaded');
    });

    test('Pushing a record into the store should transition new records to the loaded state', async function(assert) {
      let person = store.createRecord('person', { id: 1, name: 'TomHuda' });

      assert.equal(person.get('isNew'), true, 'createRecord should put records into the new state');

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'TomHuda',
          },
        },
      });

      assert.equal(person.get('isNew'), false, 'push should put move the record into the loaded state');
      // TODO either this is a bug or being able to push a record with the same ID as a client created one is a bug
      //   probably the bug is the former
      assert.equal(
        get(person, 'currentState.stateName'),
        'root.loaded.updated.uncommitted',
        'model is in loaded state'
      );
    });

    test('internalModel is ready by `init`', async function(assert) {
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

      assert.equal(nameDidChange, 0, 'observer should not trigger on create');
      let person = store.createRecord('legacy-person');
      assert.equal(nameDidChange, 0, 'observer should not trigger on create');
      assert.equal(person.get('name'), 'my-name-set-in-init');

      person = store.createRecord('native-person');
      assert.equal(person.get('name'), 'my-name-set-in-init');
    });

    test('accessing attributes during init should not throw an error', async function(assert) {
      const Person = Model.extend({
        name: DSattr('string'),

        init() {
          this._super(...arguments);
          assert.ok(this.get('name') === 'bam!', 'We all good here');
        },
      });
      this.owner.register('model:odd-person', Person);

      store.createRecord('odd-person', { name: 'bam!' });
    });
  });

  module('toJSON()', function(hooks) {
    deprecatedTest(
      'A Model can be JSONified',
      {
        id: 'ember-data:model.toJSON',
        until: '4.0',
      },
      async function(assert) {
        let record = store.createRecord('person', { name: 'TomHuda' });

        assert.deepEqual(record.toJSON(), {
          data: {
            type: 'people',
            attributes: {
              name: 'TomHuda',
              'is-archived': undefined,
              'is-drug-addict': false,
            },
          },
        });
      }
    );

    deprecatedTest(
      'toJSON looks up the JSONSerializer using the store instead of using JSONSerializer.create',
      {
        id: 'ember-data:model.toJSON',
        until: '4.0',
      },
      async function(assert) {
        class Author extends Model {
          @hasMany('post', { async: false, inverse: 'author' })
          posts;
        }
        class Post extends Model {
          @belongsTo('author', { async: false, inverse: 'posts' })
          author;
        }
        this.owner.register('model:author', Author);
        this.owner.register('model:post', Post);

        // Loading the person without explicitly
        // loading its relationships seems to trigger the
        // original bug where `this.store` was not
        // present on the serializer due to using .create
        // instead of `store.serializerFor`.
        let person = store.push({
          data: {
            type: 'author',
            id: '1',
          },
        });

        let errorThrown = false;
        let json;
        try {
          json = person.toJSON();
        } catch (e) {
          errorThrown = true;
        }

        assert.ok(!errorThrown, 'error not thrown due to missing store');
        assert.deepEqual(json, { data: { type: 'authors' } });
      }
    );
  });

  module('Updating', function() {
    test('a Model can update its attributes', async function(assert) {
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
      assert.equal(get(person, 'name'), 'Brohuda Katz', 'setting took hold');
    });

    test(`clearing the value when a Model's defaultValue was in use works`, async function(assert) {
      class Tag extends Model {
        @attr('string', { defaultValue: 'unknown' })
        name;
      }

      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');
      assert.equal(get(tag, 'name'), 'unknown', 'the default value is found');

      set(tag, 'name', null);
      assert.equal(get(tag, 'name'), null, `null doesn't shadow defaultValue`);
    });

    test(`a Model can define 'setUnknownProperty'`, async function(assert) {
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
      assert.equal(get(legacyTag, 'name'), 'old', 'precond - name is correct');

      set(legacyTag, 'name', 'edited');
      assert.equal(get(legacyTag, 'name'), 'edited', 'setUnknownProperty was not triggered');

      set(legacyTag, 'title', 'new');
      assert.equal(get(legacyTag, 'name'), 'new', 'setUnknownProperty was triggered');

      let nativeTag = store.createRecord('native-tag', { name: 'old' });
      assert.equal(get(nativeTag, 'name'), 'old', 'precond - name is correct');

      set(nativeTag, 'name', 'edited');
      assert.equal(get(nativeTag, 'name'), 'edited', 'setUnknownProperty was not triggered');

      set(nativeTag, 'title', 'new');
      assert.equal(get(nativeTag, 'name'), 'new', 'setUnknownProperty was triggered');
    });

    test('setting a property to undefined on a newly created record should not impact the current state', async function(assert) {
      class Tag extends Model {
        @attr('string')
        tagInfo;
      }
      this.owner.register('model:tag', Tag);

      let tag = store.createRecord('tag');

      set(tag, 'name', 'testing');

      assert.equal(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');

      set(tag, 'name', undefined);

      assert.equal(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');

      tag = store.createRecord('tag', { name: undefined });

      assert.equal(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');
    });

    test('setting a property back to its original value removes the property from the `_attributes` hash', async function(assert) {
      let person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
      });

      let recordData = recordDataFor(person);
      assert.equal(recordData._attributes.name, undefined, 'the `_attributes` hash is clean');

      set(person, 'name', 'Niceguy Dale');

      assert.equal(recordData._attributes.name, 'Niceguy Dale', 'the `_attributes` hash contains the changed value');

      set(person, 'name', 'Scumbag Dale');

      assert.equal(recordData._attributes.name, undefined, 'the `_attributes` hash is reset');
    });
  });

  module('Mutation', function() {
    test('can have properties and non-specified properties set on it', async function(assert) {
      let record = store.createRecord('person', { isDrugAddict: false, notAnAttr: 'my value' });
      set(record, 'name', 'bar');
      set(record, 'anotherNotAnAttr', 'my other value');

      assert.equal(get(record, 'notAnAttr'), 'my value', 'property was set on the record');
      assert.equal(get(record, 'anotherNotAnAttr'), 'my other value', 'property was set on the record');
      assert.strictEqual(get(record, 'isDrugAddict'), false, 'property was set on the record');
      assert.equal(get(record, 'name'), 'bar', 'property was set on the record');
    });

    test('setting a property on a record that has not changed does not cause it to become dirty', async function(assert) {
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

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');

      person.set('name', 'Peter');
      person.set('isDrugAddict', true);

      assert.equal(
        person.get('hasDirtyAttributes'),
        false,
        'record does not become dirty after setting property to old value'
      );
    });

    test('resetting a property on a record cause it to become clean again', async function(assert) {
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

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');

      person.set('isDrugAddict', false);

      assert.equal(
        person.get('hasDirtyAttributes'),
        true,
        'record becomes dirty after setting property to a new value'
      );

      person.set('isDrugAddict', true);

      assert.equal(
        person.get('hasDirtyAttributes'),
        false,
        'record becomes clean after resetting property to the old value'
      );
    });

    test('resetting a property to the current in-flight value causes it to become clean when the save completes', async function(assert) {
      adapter.updateRecord = function() {
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

      assert.equal(person.get('name'), 'Thomas');

      person.set('name', 'Tomathy');
      assert.equal(person.get('name'), 'Tomathy');

      person.set('name', 'Thomas');
      assert.equal(person.get('name'), 'Thomas');

      await saving;

      assert.equal(person.get('hasDirtyAttributes'), false, 'The person is now clean');
    });

    test('a record becomes clean again only if all changed properties are reset', async function(assert) {
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

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.set('isDrugAddict', false);
      assert.equal(
        person.get('hasDirtyAttributes'),
        true,
        'record becomes dirty after setting one property to a new value'
      );
      person.set('name', 'Mark');
      assert.equal(
        person.get('hasDirtyAttributes'),
        true,
        'record stays dirty after setting another property to a new value'
      );
      person.set('isDrugAddict', true);
      assert.equal(
        person.get('hasDirtyAttributes'),
        true,
        'record stays dirty after resetting only one property to the old value'
      );
      person.set('name', 'Peter');
      assert.equal(
        person.get('hasDirtyAttributes'),
        false,
        'record becomes clean after resetting both properties to the old value'
      );
    });

    test('an invalid record becomes clean again if changed property is reset', async function(assert) {
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

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.set('name', 'Wolf');
      assert.equal(
        person.get('hasDirtyAttributes'),
        true,
        'record becomes dirty after setting one property to a new value'
      );

      await person
        .save()
        .then(() => {
          assert.ok(false, 'We should reject the save');
        })
        .catch(() => {
          assert.equal(person.get('isValid'), false, 'record is not valid');
          assert.equal(person.get('hasDirtyAttributes'), true, 'record still has dirty attributes');

          person.set('name', 'Peter');

          assert.equal(person.get('isValid'), true, 'record is valid after resetting attribute to old value');
          assert.equal(
            person.get('hasDirtyAttributes'),
            false,
            'record becomes clean after resetting property to the old value'
          );
        });
    });

    test('an invalid record stays dirty if only invalid property is reset', async function(assert) {
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

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.set('name', 'Wolf');
      person.set('isDrugAddict', false);
      assert.equal(
        person.get('hasDirtyAttributes'),
        true,
        'record becomes dirty after setting one property to a new value'
      );

      await person
        .save()
        .then(() => {
          assert.ok(false, 'save should have rejected');
        })
        .catch(() => {
          assert.equal(person.get('isValid'), false, 'record is not valid');
          assert.equal(person.get('hasDirtyAttributes'), true, 'record still has dirty attributes');

          person.set('name', 'Peter');

          assert.equal(person.get('isValid'), true, 'record is valid after resetting invalid attribute to old value');
          assert.equal(person.get('hasDirtyAttributes'), true, 'record still has dirty attributes');
        });
    });

    test('it should cache attributes', async function(assert) {
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

    test('changedAttributes() return correct values', async function(assert) {
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

      assert.equal(Object.keys(mascot.changedAttributes()).length, 0, 'there are no initial changes');

      mascot.set('name', 'Tomster'); // new value
      mascot.set('likes', 'Ember.js'); // changed value
      mascot.set('isMascot', true); // same value

      let changedAttributes = mascot.changedAttributes();

      assert.deepEqual(changedAttributes.name, [undefined, 'Tomster']);
      assert.deepEqual(changedAttributes.likes, ['JavaScript', 'Ember.js']);

      mascot.rollbackAttributes();

      assert.equal(Object.keys(mascot.changedAttributes()).length, 0, 'after rollback attributes there are no changes');
    });

    test('changedAttributes() works while the record is being saved', async function(assert) {
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
      adapter.createRecord = function() {
        assert.deepEqual(cat.changedAttributes(), {
          name: [undefined, 'Argon'],
          likes: [undefined, 'Cheese'],
        });

        return resolve({ data: { id: 1, type: 'mascot' } });
      };

      let cat;

      cat = store.createRecord('mascot');
      cat.setProperties({
        name: 'Argon',
        likes: 'Cheese',
      });

      await cat.save();
    });

    test('changedAttributes() works while the record is being updated', async function(assert) {
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
      adapter.updateRecord = function() {
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

    if (gte('3.10.0')) {
      test('@attr decorator works without parens', async function(assert) {
        assert.expect(1);
        let cat;

        class Mascot extends Model {
          @attr name;
        }

        this.owner.register('model:mascot', Mascot);
        adapter.updateRecord = function() {
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

  module('Misc', function() {
    testInDebug('Calling record.attr() asserts', async function(assert) {
      let person = store.createRecord('person', { id: 1, name: 'TomHuda' });

      assert.expectAssertion(() => {
        person.attr();
      }, /Assertion Failed: The `attr` method is not available on Model, a Snapshot was probably expected\. Are you passing a Model instead of a Snapshot to your serializer\?/);
    });
  });
});
