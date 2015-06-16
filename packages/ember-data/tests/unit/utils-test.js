// TODO enable import once this is possible
// import { assertPolymorphicType } from "ember-data/utils";

var env, User, Message, Post, Person, Video, Medium;

module("unit/utils", {
  setup() {
    Person = DS.Model.extend();
    User = DS.Model.extend({
      messages: DS.hasMany('message', { async: false })
    });

    Message = DS.Model.extend();
    Post = Message.extend({
      medias: DS.hasMany('medium', { async: false })
    });

    Medium = Ember.Mixin.create();
    Video = DS.Model.extend(Medium);

    env = setupStore({
      user: User,
      person: Person,
      message: Message,
      post: Post,
      video: Video
    });

    env.registry.register('mixin:medium', Medium);
  },

  teardown() {
    Ember.run(env.container, 'destroy');
  }
});

test("assertPolymorphicType works for subclasses", function() {
  var user, post, person;

  Ember.run(function() {
    user = env.store.push('user', { id: 1, messages: [] });
    post = env.store.push('post', { id: 1 });
    person = env.store.push('person', { id: 1 });
  });

  // TODO un-comment once we test the assertPolymorphicType directly
  // var relationship = user.relationshipFor('messages');
  // user = user._internalModel;
  // post = post._internalModel;
  // person = person._internalModel;

  try {
    Ember.run(function() {
      user.get('messages').addObject(post);
    });

    // TODO enable once we can do "import { assertPolymorphicType } from "ember-data/utils"
    // assertPolymorphicType(user, relationship, post);
  } catch (e) {
    ok(false, "should not throw an error");
  }

  expectAssertion(function() {
    Ember.run(function() {
      user.get('messages').addObject(person);
    });

    // TODO enable once we can do "import { assertPolymorphicType } from "ember-data/utils"
    // assertPolymorphicType(user, relationship, person);
  }, "You cannot add a record of type 'person' to the 'user.messages' relationship (only 'message' allowed)");
});

test("assertPolymorphicType works for mixins", function() {
  var post, video, person;

  Ember.run(function() {
    post = env.store.push('post', { id: 1 });
    video = env.store.push('video', { id: 1 });
    person = env.store.push('person', { id: 1 });
  });

  // TODO un-comment once we test the assertPolymorphicType directly
  // var relationship = post.relationshipFor('medias');
  // post = post._internalModel;
  // video = video._internalModel;
  // person = person._internalModel;

  try {
    Ember.run(function() {
      post.get('medias').addObject(video);
    });

    // TODO enable once we can do "import { assertPolymorphicType } from "ember-data/utils"
    // assertPolymorphicType(post, relationship, video);
  } catch (e) {
    ok(false, "should not throw an error");
  }

  expectAssertion(function() {
    Ember.run(function() {
      post.get('medias').addObject(person);
    });

    // TODO enable once we can do "import { assertPolymorphicType } from "ember-data/utils"
    // assertPolymorphicType(post, relationship, person);
  }, "You cannot add a record of type 'person' to the 'post.medias' relationship (only 'medium' allowed)");
});
