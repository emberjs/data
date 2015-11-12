import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

module('PromiseManyArray');

test('.reload should NOT leak the internal promise, rather return another promiseArray', function(assert) {
  assert.expect(2);

  var content = Ember.A();

  content.reload = function() {
    return Ember.RSVP.Promise.resolve(content);
  };

  var array = DS.PromiseManyArray.create({
    content: content
  });

  Ember.run(function() {
    var reloaded = array.reload();

    assert.ok(reloaded instanceof DS.PromiseManyArray);

    reloaded.then(function(value) {
      assert.equal(content, value);
    });
  });
});
