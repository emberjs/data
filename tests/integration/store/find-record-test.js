import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import { attr } from '@ember-decorators/data';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import { resolve } from 'rsvp';

class Book extends Model {
  @attr
  title;

  @attr
  author;

  @attr
  requestCount;
}

module('integration/store - findRecord', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('model:book', Book);
    this.store = this.owner.lookup('service:store');
  });

  test('store.findRecord honors { reload: true } for requests that return different ids', async function(assert) {
    let findCalls = 0;

    class TestAdapter extends JSONAPIAdapter {
      findRecord() {
        ++findCalls;

        return resolve({
          data: {
            id: 'isbn:9780307700766',
            type: 'book',
            attributes: {
              author: 'Edward Gibbon',
              title: 'The History of the Decline and Fall of the Roman Empire Volume:',
              'request-count': findCalls,
            },
          },
        });
      }
    }

    this.owner.register('adapter:book', TestAdapter);

    assert.equal(findCalls, 0, 'initially no find calls');

    await this.store.findRecord('book', '1').then(record => {
      assert.equal(record.get('requestCount'), 1, 'fulfills from initial request');
    });

    assert.equal(findCalls, 1, '1 call after find');

    await this.store.findRecord('book', '1', { reload: true }).then(record => {
      assert.equal(record.get('requestCount'), 2, 'fulfills from reload request');
    });

    assert.equal(findCalls, 1, '2 calls after find with reload: true');
    assert.equal(
      this.store.hasRecordForId('book', 'isbn:9780307700766'),
      true,
      'returned record is in identity map'
    );
    assert.equal(
      this.store.hasRecordForId('book', '1'),
      false,
      'requested record is not in identity map'
    );
  });
});
