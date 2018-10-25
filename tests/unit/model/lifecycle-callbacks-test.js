import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';
import { resolve, reject } from 'rsvp';
import { attr } from '@ember-decorators/data';
import Model from 'ember-data/model';
import Adapter from 'ember-data/adapter';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import { InvalidError } from 'ember-data/adapters/errors';
import { run } from '@ember/runloop';

module('unit/model - Model Lifecycle Callbacks', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    store = this.owner.lookup('service:store');
  });

  test('didLoad() only fires for initial loads, not creates, not reloads', async function(assert) {
    let lifecycleEventMethodCalls = 0;
    class Person extends Model {
      @attr
      name;

      didLoad() {
        lifecycleEventMethodCalls++;
      }
    }
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    class AppAdapter extends Adapter {
      deleteRecord() {
        return resolve({ data: null });
      }
      createRecord() {
        return resolve({ data: { id: '0', type: 'person' } });
      }
      updateRecord() {
        return resolve({ data: { id: '1', type: 'person' } });
      }
      findRecord() {
        return resolve({ data: { id: '2', type: 'person', attributes: { name: 'Foo' } } });
      }
    }
    this.owner.register('adapter:application', AppAdapter);

    // ------ Test Create

    let record = store.createRecord('person', { name: 'Chris' });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we create locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we save after we create locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Update

    record = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 1, 'We trigger didLoad when we push');
    lifecycleEventMethodCalls = 0;

    record.set('name', 'Chris');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we save after we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Find

    record = await store.findRecord('person', '2');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We trigger didLoad when we first find a record'
    );
    lifecycleEventMethodCalls = 0;
    await record.reload();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we reload a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We trigger didLoad when we first pushed a record'
    );
    lifecycleEventMethodCalls = 0;

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when push updates to an existing same record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push with Lazy Materialization of Record

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we first push a record without materializing it'
    );
    lifecycleEventMethodCalls = 0;

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when push updates to an existing non-materialized record'
    );
    lifecycleEventMethodCalls = 0;

    store.peekRecord('person', '4');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We trigger didLoad when we first materialize a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Deletion of Record

    record = store.push({
      data: {
        id: '5',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 1, 'We trigger didLoad on push');
    lifecycleEventMethodCalls = 0;

    record.deleteRecord();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we first call record.deleteRecord'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad once we have saved the deletion'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Unloading of Record

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 1, 'We trigger didLoad on push');
    lifecycleEventMethodCalls = 0;

    record.unloadRecord();
    await settled();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didLoad when we unload a record'
    );
    lifecycleEventMethodCalls = 0;

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We trigger didLoad when we push a previously unloaded record'
    );
  });

  test('didUpdate() only fires for persisted updates', async function(assert) {
    let lifecycleEventMethodCalls = 0;
    class Person extends Model {
      @attr
      name;

      didUpdate() {
        lifecycleEventMethodCalls++;
        assert.equal(this.get('isSaving'), false, 'record should not be saving');
        assert.equal(this.get('hasDirtyAttributes'), false, 'record should not be dirty');
      }
    }
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    class AppAdapter extends Adapter {
      deleteRecord() {
        return resolve({ data: null });
      }
      createRecord() {
        return resolve({ data: { id: '0', type: 'person' } });
      }
      updateRecord() {
        return resolve({ data: { id: '1', type: 'person' } });
      }
      findRecord() {
        return resolve({ data: { id: '2', type: 'person', attributes: { name: 'Foo' } } });
      }
    }
    this.owner.register('adapter:application', AppAdapter);

    // ------ Test Create

    let record = store.createRecord('person', { name: 'Chris' });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we create locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we save after we create locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Update

    record = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 0, 'We do not trigger didUpdate when we push');
    lifecycleEventMethodCalls = 0;

    record.set('name', 'Chris');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We trigger didUpdate when we save after we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Find

    record = await store.findRecord('person', '2');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we first find a record'
    );
    lifecycleEventMethodCalls = 0;
    await record.reload();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we reload a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we first pushed a record'
    );
    lifecycleEventMethodCalls = 0;

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when push updates to an existing same record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push with Lazy Materialization of Record

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we first push a record without materializing it'
    );
    lifecycleEventMethodCalls = 0;

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when push updates to an existing non-materialized record'
    );
    lifecycleEventMethodCalls = 0;

    store.peekRecord('person', '4');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we first materialize a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Deletion of Record

    record = store.push({
      data: {
        id: '5',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 0, 'We do not trigger didUpdate on push');
    lifecycleEventMethodCalls = 0;

    record.deleteRecord();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we first call record.deleteRecord'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate once we have saved the deletion'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Unloading of Record

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 0, 'We do not trigger didUpdate on push');
    lifecycleEventMethodCalls = 0;

    record.unloadRecord();
    await settled();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we unload a record'
    );
    lifecycleEventMethodCalls = 0;

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didUpdate when we push a previously unloaded record'
    );
  });

  test('didCreate() only fires for persisted creates', async function(assert) {
    let lifecycleEventMethodCalls = 0;
    class Person extends Model {
      @attr
      name;

      didCreate() {
        lifecycleEventMethodCalls++;
        assert.equal(this.get('isSaving'), false, 'record should not be saving');
        assert.equal(this.get('hasDirtyAttributes'), false, 'record should not be dirty');
      }
    }
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    class AppAdapter extends Adapter {
      deleteRecord() {
        return resolve({ data: null });
      }
      createRecord() {
        assert.equal(
          lifecycleEventMethodCalls,
          0,
          'didCreate callback was not called before adapter.createRecord resolves'
        );
        return resolve({ data: { id: '0', type: 'person' } });
      }
      updateRecord() {
        return resolve({ data: { id: '1', type: 'person' } });
      }
      findRecord() {
        return resolve({ data: { id: '2', type: 'person', attributes: { name: 'Foo' } } });
      }
    }
    this.owner.register('adapter:application', AppAdapter);

    // ------ Test Create

    let record = store.createRecord('person', { name: 'Chris' });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we create locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We trigger didCreate when we save after we create locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Update

    record = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 0, 'We do not trigger didCreate when we push');
    lifecycleEventMethodCalls = 0;

    record.set('name', 'Chris');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we save after we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Find

    record = await store.findRecord('person', '2');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we first find a record'
    );
    lifecycleEventMethodCalls = 0;
    await record.reload();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we reload a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we first push a record'
    );
    lifecycleEventMethodCalls = 0;

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when push updates to an existing record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push with Lazy Materialization of Record

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we first push a record without materializing it'
    );
    lifecycleEventMethodCalls = 0;

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when push updates to an existing non-materialized record'
    );
    lifecycleEventMethodCalls = 0;

    store.peekRecord('person', '4');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we first materialize a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Deletion of Record

    record = store.push({
      data: {
        id: '5',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 0, 'We do not trigger didCreate on push');
    lifecycleEventMethodCalls = 0;

    record.deleteRecord();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we first call record.deleteRecord'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate once we have saved the deletion'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Unloading of Record

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 0, 'We do not trigger didCreate on push');
    lifecycleEventMethodCalls = 0;

    record.unloadRecord();
    await settled();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we unload a record'
    );
    lifecycleEventMethodCalls = 0;

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didCreate when we push a previously unloaded record'
    );
  });

  test('didDelete() only fires for persisted deletions', async function(assert) {
    let lifecycleEventMethodCalls = 0;
    class Person extends Model {
      @attr
      name;

      didDelete() {
        lifecycleEventMethodCalls++;
        assert.equal(this.get('isSaving'), false, 'record should not be saving');
        assert.equal(this.get('hasDirtyAttributes'), false, 'record should not be dirty');
      }
    }
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    class AppAdapter extends Adapter {
      deleteRecord() {
        assert.equal(
          lifecycleEventMethodCalls,
          0,
          'didDelete callback was not called before adapter.deleteRecord resolves'
        );
        return resolve({ data: null });
      }
      createRecord() {
        return resolve({ data: { id: '0', type: 'person' } });
      }
      updateRecord() {
        return resolve({ data: { id: '1', type: 'person' } });
      }
      findRecord() {
        return resolve({ data: { id: '2', type: 'person', attributes: { name: 'Foo' } } });
      }
    }
    this.owner.register('adapter:application', AppAdapter);

    // ------ Test Create

    let record = store.createRecord('person', { name: 'Chris' });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we create locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we save after we create locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Update

    record = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(lifecycleEventMethodCalls, 0, 'We do not trigger didDelete when we push');
    lifecycleEventMethodCalls = 0;

    record.set('name', 'Chris');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we save after we mutate locally'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Find

    record = await store.findRecord('person', '2');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we first find a record'
    );
    lifecycleEventMethodCalls = 0;
    await record.reload();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we reload a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we first push a record'
    );
    lifecycleEventMethodCalls = 0;

    store.push({
      data: {
        id: '3',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when push updates to an existing record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Push with Lazy Materialization of Record

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'James',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we first push a record without materializing it'
    );
    lifecycleEventMethodCalls = 0;

    store._push({
      data: {
        id: '4',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when push updates to an existing non-materialized record'
    );
    lifecycleEventMethodCalls = 0;

    store.peekRecord('person', '4');
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we first materialize a record'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Deletion of Record

    record = store.push({
      data: {
        id: '5',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    record.deleteRecord();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we first call record.deleteRecord'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We trigger didDelete once we have saved the deletion'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Unloading of Record

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    record.unloadRecord();
    await settled();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we unload a record'
    );
    lifecycleEventMethodCalls = 0;

    record = store.push({
      data: {
        id: '6',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we reload a previously unloaded record'
    );
  });

  test('didDelete() triggers for uncommitted records when the deletion is persisted', async function(assert) {
    let lifecycleEventMethodCalls = 0;
    class Person extends Model {
      @attr
      name;

      didDelete() {
        lifecycleEventMethodCalls++;
        assert.equal(this.get('isSaving'), false, 'record should not be saving');
        assert.equal(this.get('hasDirtyAttributes'), false, 'record should not be dirty');
      }
    }
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    class AppAdapter extends Adapter {
      deleteRecord() {
        assert.equal(
          lifecycleEventMethodCalls,
          0,
          'didDelete callback was not called before adapter.deleteRecord resolves'
        );
        return resolve({ data: null });
      }
    }
    this.owner.register('adapter:application', AppAdapter);

    // ------ Test Deletion of Record

    let record = store.createRecord('person', { name: 'Tomster' });

    record.deleteRecord();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we first call record.deleteRecord'
    );
    lifecycleEventMethodCalls = 0;

    await settled();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      1,
      'We do not trigger didDelete when we first call record.deleteRecord'
    );
    lifecycleEventMethodCalls = 0;

    await record.save();
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete once we have saved the deletion, as we secretly did previously'
    );
    lifecycleEventMethodCalls = 0;

    // ------ Test Unloading of Record

    record = store.createRecord('person', { name: 'Tomster' });

    // ideally we could `await settled()` but Ember 2.18 does not handle `destroy()` calls in this case.
    run(() => record.unloadRecord());

    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger didDelete when we unload a record'
    );
  });

  test('becameInvalid() triggers when an update rejects with an error for a member', async function(assert) {
    let lifecycleEventMethodCalls = 0;
    class Person extends Model {
      @attr
      name;

      becameInvalid() {
        lifecycleEventMethodCalls++;
        assert.equal(this.get('isSaving'), false, 'record should not be saving');
        assert.equal(this.get('hasDirtyAttributes'), true, 'record should not be dirty');
      }
    }
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    class AppAdapter extends Adapter {
      updateRecord() {
        assert.equal(
          lifecycleEventMethodCalls,
          0,
          'becameInvalid callback was not called before adapter.updateRecord resolves'
        );
        let error = new InvalidError([
          {
            title: 'Invalid Attribute',
            detail: 'error',
            source: {
              pointer: '/data/attributes/name',
            },
          },
        ]);

        return reject(error);
      }
    }
    this.owner.register('adapter:application', AppAdapter);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Great Name!',
        },
      },
    });
    assert.strictEqual(
      lifecycleEventMethodCalls,
      0,
      'We do not trigger becameInvalid when we first push the record to the store'
    );
    lifecycleEventMethodCalls = 0;

    person.set('name', 'Bad Bad Name');

    await person.save().catch(reason => {
      assert.strictEqual(lifecycleEventMethodCalls, 1, 'We trigger becameInvalid when we reject');

      assert.ok(reason.isAdapterError, 'reason should have been an adapter error');
      assert.equal(reason.errors.length, 1, 'reason should have one error');
      assert.equal(reason.errors[0].title, 'Invalid Attribute');
    });
  });
});
