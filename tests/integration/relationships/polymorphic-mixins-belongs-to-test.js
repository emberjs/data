import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, User, Message, Video, NotMessage;
var run = Ember.run;

var attr = DS.attr;
var belongsTo = DS.belongsTo;

module('integration/relationships/polymorphic_mixins_belongs_to_test - Polymorphic belongsTo relationships with mixins', {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      bestMessage: belongsTo('message', { async: true, polymorphic: true })
    });

    Message = Ember.Mixin.create({
      title: attr('string'),
      user: belongsTo('user', { async: true })
    });

    NotMessage = DS.Model.extend({
      video: attr()
    });

    Video = DS.Model.extend(Message, {
      video: attr()
    });

    env = setupStore({
      user: User,
      video: Video,
      notMessage: NotMessage
    });

    env.registry.register('mixin:message', Message);
    store = env.store;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test("Relationship is available from the belongsTo side even if only loaded from the inverse side - async", function(assert) {
  var user, video;
  run(function() {
    store.push({
      data: [{
        type: 'user',
        id: '1',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestMessage: {
            data: { type: 'video', id: '2' }
          }
        }
      }, {
        type: 'video',
        id: '2',
        attributes: {
          video: 'Here comes Youtube'
        }
      }]
    });
    user = store.peekRecord('user', 1);
    video = store.peekRecord('video', 2);
  });
  run(function() {
    user.get('bestMessage').then(function(message) {
      assert.equal(message, video, 'The message was loaded correctly');
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'The inverse was setup correctly');
      });
    });
  });
});

/*
  Local edits
*/
test("Setting the polymorphic belongsTo gets propagated to the inverse side - async", function(assert) {
  var user, video;
  run(function() {
    store.push({
      data: [{
        type: 'user',
        id: '1',
        attributes: {
          name: 'Stanley'
        }
      }, {
        type: 'video',
        id: '2',
        attributes: {
          video: 'Here comes Youtube'
        }
      }]
    });
    user = store.peekRecord('user', 1);
    video = store.peekRecord('video', 2);
  });

  run(function() {
    user.set('bestMessage', video);
    video.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, user, "user got set correctly");
    });
    user.get('bestMessage').then(function(message) {
      assert.equal(message, video, 'The message was set correctly');
    });
  });
});

testInDebug("Setting the polymorphic belongsTo with an object that does not implement the mixin errors out", function(assert) {
  var user, video;
  run(function() {
    store.push({
      data: [{
        type: 'user',
        id: '1',
        attributes: {
          name: 'Stanley'
        }
      }, {
        type: 'not-message',
        id: '2',
        attributes: {
          video: 'Here comes Youtube'
        }
      }]
    });
    user = store.peekRecord('user', 1);
    video = store.peekRecord('not-message', 2);
  });

  run(function() {
    assert.expectAssertion(function() {
      user.set('bestMessage', video);
    }, /You cannot add a record of modelClass 'not-message' to the 'user.bestMessage' relationship \(only 'message' allowed\)/);
  });
});


test("Setting the polymorphic belongsTo gets propagated to the inverse side - model injections true", function(assert) {
  assert.expect(2);
  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    var user, video;
    run(function() {
      store.push({
        data: [{
          type: 'user',
          id: '1',
          attributes: {
            name: 'Stanley'
          }
        }, {
          type: 'video',
          id: '2',
          attributes: {
            video: 'Here comes Youtube'
          }
        }]
      });
      user = store.peekRecord('user', 1);
      video = store.peekRecord('video', 2);
    });

    run(function() {
      user.set('bestMessage', video);
      video.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, "user got set correctly");
      });
      user.get('bestMessage').then(function(message) {
        assert.equal(message, video, 'The message was set correctly');
      });
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

testInDebug("Setting the polymorphic belongsTo with an object that does not implement the mixin errors out - model injections true", function(assert) {
  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    var user, video;
    run(function() {
      store.push({
        data: [{
          type: 'user',
          id: '1',
          attributes: {
            name: 'Stanley'
          }
        }, {
          type: 'not-message',
          id: '2',
          attributes: {
            video: 'Here comes Youtube'
          }
        }]
      });
      user = store.peekRecord('user', 1);
      video = store.peekRecord('not-message', 2);
    });

    run(function() {
      assert.expectAssertion(function() {
        user.set('bestMessage', video);
      }, /You cannot add a record of modelClass 'not-message' to the 'user.bestMessage' relationship \(only 'message' allowed\)/);
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});
