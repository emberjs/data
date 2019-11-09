import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import EmberObject from '@ember/object';
import Store from 'adapter-encapsulation-test-app/services/store';
import Model, { attr } from '@ember-data/model';
import Transform from '@ember-data/serializer/transform';
import { resolve } from 'rsvp';

class MinimalSerializer extends EmberObject {
  normalizeResponse(_, __, data) {
    return data;
  }
}

class Person extends Model {
  @attr
  firstName;

  @attr
  lastName;
}

function setupReloadTest(options) {
  class TestMinimumAdapter extends EmberObject {
    shouldReloadAllCalled = 0;
    shouldReloadRecordCalled = 0;
    shouldBackgroundReloadAllCalled = 0;
    shouldBackgroundReloadRecordCalled = 0;

    requestsMade = 0;

    constructor() {
      super(...arguments);

      if (options.shouldReloadAll !== undefined) {
        this.shouldReloadAll = function() {
          this.shouldReloadAllCalled++;
          return options.shouldReloadAll;
        };
      }

      if (options.shouldReloadRecord !== undefined) {
        this.shouldReloadRecord = function() {
          this.shouldReloadRecordCalled++;
          return options.shouldReloadRecord;
        };
      }
      if (options.shouldBackgroundReloadAll !== undefined) {
        this.shouldBackgroundReloadAll = function() {
          this.shouldBackgroundReloadAllCalled++;
          return options.shouldBackgroundReloadAll;
        };
      }

      if (options.shouldBackgroundReloadRecord !== undefined) {
        this.shouldBackgroundReloadRecord = function() {
          this.shouldBackgroundReloadRecordCalled++;
          return options.shouldBackgroundReloadRecord;
        };
      }
    }

    findAll() {
      this.requestsMade++;
      return resolve(options.resolveFindAllWith || { data: [] });
    }

    findRecord() {
      this.requestsMade++;
      return resolve(options.resolveFindRecordWith || { data: null });
    }
  }
  this.owner.register('adapter:application', TestMinimumAdapter);

  this.store = this.owner.lookup('service:store');
  this.adapter = this.owner.lookup('adapter:application');
}

module('integration/reload - Reloading Tests', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    // Needed to avoid deprecation warning even though not using any transforms.
    this.owner.register('transform:date', class DateTransform extends Transform {});
    this.owner.register('transform:number', class NumberTransform extends Transform {});
    this.owner.register('transform:boolean', class BooleanTransform extends Transform {});
    this.owner.register('transform:string', class StringTransform extends Transform {});

    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  module('adapter.shouldReloadAll', function() {
    test('adapter.shouldReloadAll is not called when store.findAll is called with a reload: false flag', async function(assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person', { reload: false });

      assert.equal(this.adapter.shouldReloadAllCalled, 0, 'shouldReloadAll is not called');
      assert.equal(this.adapter.requestsMade, 0, 'no request is made');
    });

    test('adapter.shouldReloadAll is not called when store.findAll is called with a reload: true flag', async function(assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person', { reload: true });

      assert.equal(this.adapter.shouldReloadAllCalled, 0, 'shouldReloadAll is not called');
      assert.equal(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('store.findAll does not error if adapter.shouldReloadAll is not defined (records are present)', async function(assert) {
      setupReloadTest.call(this, {
        shouldBackgroundReloadAll: false,
      });

      this.store.push({
        data: {
          id: 1,
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      });

      await this.store.findAll('person');

      assert.equal(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('store.findAll does not error if adapter.shouldReloadAll is not defined (records are absent)', async function(assert) {
      setupReloadTest.call(this, {
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person');

      assert.equal(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldReloadAll is called when store.findAll is called without a reload flag (shouldReloadAll is false)', async function(assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person');

      assert.equal(this.adapter.shouldReloadAllCalled, 1, 'shouldReloadAll is called');
      assert.equal(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('adapter.shouldReloadAll is called when store.findAll is called without a reload flag (shouldReloadAll is false)', async function(assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: true,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person');

      assert.equal(this.adapter.shouldReloadAllCalled, 1, 'shouldReloadAll is called');
      assert.equal(this.adapter.requestsMade, 1, 'an ajax request is made');
    });
  });

  module('adapter.shouldBackgroundReloadAll', function() {});
  module('adapter.shouldReloadRecord', function() {});
  module('adapter.shouldBackgroundReloadRecord', function() {});
});
