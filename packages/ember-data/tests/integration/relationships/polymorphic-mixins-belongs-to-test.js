var env, store, User, Message, Video, NotMessage;
var run = Ember.run;

var attr = DS.attr;
var belongsTo = DS.belongsTo;

function stringify(string) {
  return function() { return string; };
}

module('integration/relationships/polymorphic_mixins_belongs_to_test - Polymorphic belongsTo relationships with mixins', {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      bestMessage: belongsTo('message', { async: true, polymorphic: true })
    });
    User.toString = stringify('User');

    Message = Ember.Mixin.create({
      title: attr('string'),
      user: belongsTo('user', { async: true })
    });
    Message.toString = stringify('Message');

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

  teardown: function() {
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test("Relationship is available from the belongsTo side even if only loaded from the inverse side - async", function () {
  var user, video;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', bestMessage: 2, bestMessageType: 'video' });
    video = store.push('video', { id: 2, video: 'Here comes Youtube' });
  });
  run(function() {
    user.get('bestMessage').then(function(message) {
      equal(message, video, 'The message was loaded correctly');
      message.get('user').then(function(fetchedUser) {
        equal(fetchedUser, user, 'The inverse was setup correctly');
      });
    });
  });
});

/*
  Local edits
*/
test("Setting the polymorphic belongsTo gets propagated to the inverse side - async", function () {
  var user, video;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley' });
    video = store.push('video', { id: 2, video: 'Here comes Youtube' });
  });

  run(function() {
    user.set('bestMessage', video);
    video.get('user').then(function(fetchedUser) {
      equal(fetchedUser, user, "user got set correctly");
    });
    user.get('bestMessage').then(function(message) {
      equal(message, video, 'The message was set correctly');
    });
  });
});

test("Setting the polymorphic belongsTo with an object that does not implement the mixin errors out", function () {
  var user, video;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley' });
    video = store.push('not-message', { id: 2, video: 'Here comes Youtube' });
  });

  run(function() {
    expectAssertion(function() {
      user.set('bestMessage', video);
    }, /You cannot add a record of type 'not-message' to the 'user.bestMessage' relationship \(only 'message' allowed\)/);
  });
});


test("Setting the polymorphic belongsTo gets propagated to the inverse side - model injections true", function () {
  expect(2);
  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    var user, video;
    run(function() {
      user = store.push('user', { id: 1, name: 'Stanley' });
      video = store.push('video', { id: 2, video: 'Here comes Youtube' });
    });

    run(function() {
      user.set('bestMessage', video);
      video.get('user').then(function(fetchedUser) {
        equal(fetchedUser, user, "user got set correctly");
      });
      user.get('bestMessage').then(function(message) {
        equal(message, video, 'The message was set correctly');
      });
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

test("Setting the polymorphic belongsTo with an object that does not implement the mixin errors out - model injections true", function () {
  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    var user, video;
    run(function() {
      user = store.push('user', { id: 1, name: 'Stanley' });
      video = store.push('not-message', { id: 2, video: 'Here comes Youtube' });
    });

    run(function() {
      expectAssertion(function() {
        user.set('bestMessage', video);
      }, /You cannot add a record of type 'not-message' to the 'user.bestMessage' relationship \(only 'message' allowed\)/);
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});
