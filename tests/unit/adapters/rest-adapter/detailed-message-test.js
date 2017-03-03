import setupStore from 'dummy/tests/helpers/store';

import {module, test} from 'qunit';

import DS from 'ember-data';

let adapter, env;

module('unit/adapters/rest_adapter/detailed_message_test - DS.RESTAdapter#generatedDetailedMessage', {
  beforeEach() {
    env = setupStore({ adapter: DS.RESTAdapter });
    adapter = env.adapter;
  }
});

test('generating a wonderfully friendly error message should work', function(assert) {
  assert.expect(1);

  let friendlyMessage = adapter.generatedDetailedMessage(
    418,
    { "Content-Type": "text/plain" },
    "I'm a little teapot, short and stout",
    {
      url: "/teapots/testing",
      method: "GET"
    }
  );

  assert.equal(friendlyMessage, [
    'Ember Data Request GET /teapots/testing returned a 418',
    'Payload (text/plain)',
    `I'm a little teapot, short and stout`
  ].join('\n'));
});

test('generating a friendly error message with a missing content-type header should work', function(assert) {
  let friendlyMessage = adapter.generatedDetailedMessage(
    418,
    {},
    `I'm a little teapot, short and stout`,
    {
      url: '/teapots/testing',
      method: 'GET'
    }
  );

  assert.equal(friendlyMessage, [
    'Ember Data Request GET /teapots/testing returned a 418',
    'Payload (Empty Content-Type)',
    `I'm a little teapot, short and stout`
  ].join('\n'));
});
