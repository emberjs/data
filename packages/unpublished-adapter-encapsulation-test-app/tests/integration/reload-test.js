import EmberObject from '@ember/object';

import Store from 'adapter-encapsulation-test-app/services/store';
import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

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
        this.shouldReloadAll = function () {
          this.shouldReloadAllCalled++;
          return options.shouldReloadAll;
        };
      }

      if (options.shouldReloadRecord !== undefined) {
        this.shouldReloadRecord = function () {
          this.shouldReloadRecordCalled++;
          return options.shouldReloadRecord;
        };
      }
      if (options.shouldBackgroundReloadAll !== undefined) {
        this.shouldBackgroundReloadAll = function () {
          this.shouldBackgroundReloadAllCalled++;
          return options.shouldBackgroundReloadAll;
        };
      }

      if (options.shouldBackgroundReloadRecord !== undefined) {
        this.shouldBackgroundReloadRecord = function () {
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

module('integration/reload - Reloading Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  module('adapter.shouldReloadAll', function () {
    test('adapter.shouldReloadAll is not called when store.findAll is called with a reload: false flag', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person', { reload: false });

      assert.strictEqual(this.adapter.shouldReloadAllCalled, 0, 'shouldReloadAll is not called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no request is made');
    });

    test('adapter.shouldReloadAll is not called when store.findAll is called with a reload: true flag', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person', { reload: true });

      assert.strictEqual(this.adapter.shouldReloadAllCalled, 0, 'shouldReloadAll is not called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('store.findAll does not error if adapter.shouldReloadAll is not defined (records are present)', async function (assert) {
      setupReloadTest.call(this, {
        shouldBackgroundReloadAll: false,
      });

      this.store.push({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('store.findAll does not error if adapter.shouldReloadAll is not defined (records are absent)', async function (assert) {
      setupReloadTest.call(this, {
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldReloadAll is called when store.findAll is called without a reload flag (shouldReloadAll is false)', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.shouldReloadAllCalled, 1, 'shouldReloadAll is called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('adapter.shouldReloadAll is called when store.findAll is called without a reload flag (shouldReloadAll is false)', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: true,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.shouldReloadAllCalled, 1, 'shouldReloadAll is called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });
  });

  module('adapter.shouldBackgroundReloadAll', function () {
    test('adapter.shouldBackgroundReloadAll is not called called when store.findAll is called with reload: true flag (but we do make request)', async function (assert) {
      setupReloadTest.call(this, {});

      await this.store.findAll('person', { reload: true });

      assert.strictEqual(this.adapter.shouldBackgroundReloadAllCalled, 0, 'shouldBackgroundReloadAll not called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadAll is not called called when store.findAll is called and adaptershouldReloadAll() returns true (but we do make request)', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: true,
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.shouldBackgroundReloadAllCalled, 0, 'shouldBackgroundReloadAll not called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadAll is not called when store.findAll is called with backroundReload: true', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
      });

      await this.store.findAll('person', { backgroundReload: true });

      assert.strictEqual(this.adapter.shouldBackgroundReloadAllCalled, 0, 'shouldBackgroundReloadAll is not called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadAll is not called when store.findAll is called with backroundReload: false', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
      });

      await this.store.findAll('person', { backgroundReload: false });

      assert.strictEqual(this.adapter.shouldBackgroundReloadAllCalled, 0, 'shouldBackgroundReloadAll is not called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('store.findAll does not error if adapter.shouldBackgroundReloadAll is undefined and backgroundReload is not present.', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadAll is called when store.findAll is called and there is no backgroundReload flag (returns true)', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: true,
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.shouldBackgroundReloadAllCalled, 1, 'shouldBackgroundReloadAll is called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadAll is called when store.findAll is called and there is no backgroundReload flag (returns false)', async function (assert) {
      setupReloadTest.call(this, {
        shouldReloadAll: false,
        shouldBackgroundReloadAll: false,
      });

      await this.store.findAll('person');

      assert.strictEqual(this.adapter.shouldBackgroundReloadAllCalled, 1, 'shouldBackgroundReloadAll is called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });
  });

  module('adapter.shouldReloadRecord', function () {
    test('adapter.shouldReloadRecord is not called when store.findRecord is called for an unloaded record (but we do make request)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      let record = this.store.push(payload);

      this.store.unloadRecord(record);

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.shouldReloadRecordCalled, 0, 'shouldReloadRecord is not called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldReloadRecord is not called when store.findRecord is called for a never loaded record (but we do make request)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.shouldReloadRecordCalled, 0, 'shouldReloadRecord is not called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldReloadRecord is not called when store.findRecord is called with a reload flag (but we do make request if reload is true)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1', { reload: true });

      assert.strictEqual(this.adapter.shouldReloadRecordCalled, 0, 'shouldReloadRecord is not called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldReloadRecord is not called when store.findRecord is called with a reload flag (and we do not make request if reload is false)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1', { reload: false });

      assert.strictEqual(this.adapter.shouldReloadRecordCalled, 0, 'shouldReloadRecord is not called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('if adapter.shouldReloadRecord is undefined, we default to false and do not make a request', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.shouldReloadRecordCalled, 0, 'shouldReloadRecord is not called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('adapter.shouldReloadRecord is called when store.findRecord is called without a reload flag (shouldReloadRecord returns true)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldReloadRecord: true,
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.shouldReloadRecordCalled, 1, 'shouldReloadRecord is called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldReloadRecord is called when store.findRecord is called without a reload flag (shouldReloadRecord returns false)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldReloadRecord: false,
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.shouldReloadRecordCalled, 1, 'shouldReloadRecord is called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });
  });

  module('adapter.shouldBackgroundReloadRecord', function () {
    test('adapter.shouldBackgroundReloadRecord is not called when store.findRecord is called for an unloaded record (but we do make request)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        resolveFindRecordWith: payload,
      });

      let record = this.store.push(payload);

      this.store.unloadRecord(record);

      await this.store.findRecord('person', '1');

      assert.strictEqual(
        this.adapter.shouldBackgroundReloadRecordCalled,
        0,
        'shouldBackgroundReloadRecord is not called'
      );
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadRecord is not called when store.findRecord is called for a never loaded record (but we do make request)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        resolveFindRecordWith: payload,
      });

      await this.store.findRecord('person', '1');

      assert.strictEqual(
        this.adapter.shouldBackgroundReloadRecordCalled,
        0,
        'shouldBackgroundReloadRecord is not called'
      );
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadRecord is not called called when store.findRecord is called with reload: true flag (but we do make request)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1', { reload: true });

      assert.strictEqual(
        this.adapter.shouldBackgroundReloadRecordCalled,
        0,
        'shouldBackgroundReloadRecord is not called'
      );
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadRecord is not called called when store.findRecord is called and shouldReloadRecord returns true (but we do make request)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldReloadRecord: true,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1');

      assert.strictEqual(
        this.adapter.shouldBackgroundReloadRecordCalled,
        0,
        'shouldBackgroundReloadRecord is not called'
      );
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadRecord is not called when store.findRecord is called with backroundReload as an option (backgroundReload is true)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1', { backgroundReload: true });

      assert.strictEqual(
        this.adapter.shouldBackgroundReloadRecordCalled,
        0,
        'shouldBackgroundReloadRecord is not called'
      );
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadRecord is not called when store.findRecord is called with backroundReload as an option (backgroundReload is false)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1', { backgroundReload: false });

      assert.strictEqual(
        this.adapter.shouldBackgroundReloadRecordCalled,
        0,
        'shouldBackgroundReloadRecord is not called'
      );
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });

    test('store.findRecord does not error if adapter.shouldBackgroundReloadRecord is undefined and backgroundReload is not present.', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadRecord is called when store.findRecord is called and there is no backgroundReload flag (adapter.shouldBackgroundReloadRecord() returns true)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldBackgroundReloadRecord: true,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.shouldBackgroundReloadRecordCalled, 1, 'shouldBackgroundReloadRecord is called');
      assert.strictEqual(this.adapter.requestsMade, 1, 'an ajax request is made');
    });

    test('adapter.shouldBackgroundReloadRecord is called when store.findRecord is called and there is no backgroundReload flag (adapter.shouldBackgroundReloadRecord() returns false)', async function (assert) {
      let payload = {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      };

      setupReloadTest.call(this, {
        shouldBackgroundReloadRecord: false,
        resolveFindRecordWith: payload,
      });

      this.store.push(payload);

      await this.store.findRecord('person', '1');

      assert.strictEqual(this.adapter.shouldBackgroundReloadRecordCalled, 1, 'shouldBackgroundReloadRecord is called');
      assert.strictEqual(this.adapter.requestsMade, 0, 'no ajax request is made');
    });
  });
});
