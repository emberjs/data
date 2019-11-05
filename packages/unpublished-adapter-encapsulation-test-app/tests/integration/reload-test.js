import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import EmberObject from '@ember/object';
import Store from '@ember-data/store';
import Model, { attr } from '@ember-data/model';
import { resolve } from 'rsvp';

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
      return resolve([]);
    }

    findRecord() {
      this.requestsMade++;
      return resolve({});
    }
  }
  this.owner.register('adapter:application', TestMinimumAdapter);

  this.store = this.owner.lookup('service:store');
  this.adapter = this.owner.lookup('adapter:application');
}

module('integration/reload - Reloading Tests', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('service:store', Store);
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
  });

  module('adapter.shouldBackgroundReloadAll', function() {});
  module('adapter.shouldReloadRecord', function() {});
  module('adapter.shouldBackgroundReloadRecord', function() {});
});
