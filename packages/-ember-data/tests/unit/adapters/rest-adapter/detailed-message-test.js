import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import RESTSerializer from '@ember-data/serializer/rest';

module('unit/adapters/rest_adapter/detailed_message_test - RESTAdapter#generatedDetailedMessage', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());
  });

  test('generating a wonderfully friendly error message should work', function (assert) {
    assert.expect(1);

    let adapter = this.owner.lookup('adapter:application');

    let friendlyMessage = adapter.generatedDetailedMessage(
      418,
      { 'content-type': 'text/plain' },
      "I'm a little teapot, short and stout",
      {
        url: '/teapots/testing',
        method: 'GET',
      }
    );

    assert.strictEqual(
      friendlyMessage,
      [
        'Ember Data Request GET /teapots/testing returned a 418',
        'Payload (text/plain)',
        `I'm a little teapot, short and stout`,
      ].join('\n')
    );
  });

  test('generating a friendly error message with a missing content-type header should work', function (assert) {
    let adapter = this.owner.lookup('adapter:application');

    let friendlyMessage = adapter.generatedDetailedMessage(418, {}, `I'm a little teapot, short and stout`, {
      url: '/teapots/testing',
      method: 'GET',
    });

    assert.strictEqual(
      friendlyMessage,
      [
        'Ember Data Request GET /teapots/testing returned a 418',
        'Payload (Empty Content-Type)',
        `I'm a little teapot, short and stout`,
      ].join('\n')
    );
  });
});
