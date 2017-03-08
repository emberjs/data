import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

module('PromiseManyArray');

test('.reload should NOT leak the internal promise, rather return another promiseArray', function(assert) {
  assert.expect(2);

  let content = Ember.A();

  content.reload = () => Ember.RSVP.Promise.resolve(content);

  let array = DS.PromiseManyArray.create({
    content: content
  });

  let reloaded = array.reload();

  assert.ok(reloaded instanceof DS.PromiseManyArray);

  return reloaded.then(value => assert.equal(content, value));
});
