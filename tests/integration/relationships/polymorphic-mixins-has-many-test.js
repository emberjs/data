import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, User, Message, NotMessage, Video;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;

module('integration/relationships/polymorphic_mixins_has_many_test - Polymorphic hasMany relationships with mixins', {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { async: true, polymorphic: true })
    });

    Message = Ember.Mixin.create({
      title: attr('string'),
      user: belongsTo('user', { async: true })
    });

    Video = DS.Model.extend(Message, {
      video: attr()
    });

    NotMessage = DS.Model.extend({
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

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - async", function(assert) {
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
          messages: {
            data: [
              { type: 'video', id: '2' }
            ]
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
    user.get('messages').then(function(messages) {
      assert.equal(messages.objectAt(0), video, 'The hasMany has loaded correctly');
      messages.objectAt(0).get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'The inverse was setup correctly');
      });
    });
  });
});

/*
  Local edits
*/
test("Pushing to the hasMany reflects the change on the belongsTo side - async", function(assert) {
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
          messages: {
            data: []
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
    user.get('messages').then(function(fetchedMessages) {
      fetchedMessages.pushObject(video);
      video.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, "user got set correctly");
      });
    });
  });
});

/*
  Local edits
*/
testInDebug("Pushing a an object that does not implement the mixin to the mixin accepting array errors out", function(assert) {
  var user,notMessage;
  run(function() {
    store.push({
      data: [{
        type: 'user',
        id: '1',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: []
          }
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
    notMessage = store.peekRecord('not-message', 2);
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      assert.expectAssertion(function() {
        fetchedMessages.pushObject(notMessage);
      }, /You cannot add a record of modelClass 'not-message' to the 'user.messages' relationship \(only 'message' allowed\)/);
    });
  });
});

test("Pushing to the hasMany reflects the change on the belongsTo side - model injections true", function(assert) {
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
          },
          relationships: {
            messages: {
              data: []
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
      user.get('messages').then(function(fetchedMessages) {
        fetchedMessages.pushObject(video);
        video.get('user').then(function(fetchedUser) {
          assert.equal(fetchedUser, user, "user got set correctly");
        });
      });
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

/*
  Local edits
*/
testInDebug("Pushing a an object that does not implement the mixin to the mixin accepting array errors out - model injections true", function(assert) {
  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    var user,notMessage;
    run(function() {
      store.push({
        data: [{
          type: 'user',
          id: '1',
          attributes: {
            name: 'Stanley'
          },
          relationships: {
            messages: {
              data: []
            }
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
      notMessage = store.peekRecord('not-message', 2);
    });

    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        assert.expectAssertion(function() {
          fetchedMessages.pushObject(notMessage);
        }, /You cannot add a record of modelClass 'not-message' to the 'user.messages' relationship \(only 'message' allowed\)/);
      });
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

