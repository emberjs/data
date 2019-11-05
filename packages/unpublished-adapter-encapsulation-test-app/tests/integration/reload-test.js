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

module('integration/reload - Reloading Tests', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('service:store', Store);
    this.owner.register('model:person', Person);
  });

  module('adapter.shouldReloadAll', function() {
    test('adapter.shouldReloadAll is not called when store.findAll is called with a reload: false flag', async function(assert) {
      let shouldReloadAllCalled = 0;
      let requestsMade = 0;

      class TestMinimumAdapter extends EmberObject {
        shouldReloadAll() {
          shouldReloadAllCalled++;
          return false;
        }

        async findAll() {
          requestsMade++;
          return resolve([]);
        }
      }

      this.owner.register('adapter:application', TestMinimumAdapter);

      const store = this.owner.lookup('service:store');

      await store.findAll('person', { reload: false });

      assert.equal(shouldReloadAllCalled, 0, 'shouldReloadAll is not called');
      assert.equal(requestsMade, 0, 'no request is made');
    });
  });

  module('adapter.shouldBackgroundReloadAll', function() {});
  module('adapter.shouldReloadRecord', function() {});
  module('adapter.shouldBackgroundReloadRecord', function() {});
});
