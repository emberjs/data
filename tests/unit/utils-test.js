import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';
import Model from 'ember-data/model';

import { assertPolymorphicType } from 'ember-data/-debug';
import { modelHasAttributeOrRelationshipNamedType } from 'ember-data/-private';

let env, User, Message, Post, Person, Video, Medium;

module('unit/utils', {
  beforeEach() {
    Person = Model.extend();
    User = Model.extend({
      messages: DS.hasMany('message', { async: false })
    });

    Message = Model.extend();
    Post = Message.extend({
      medias: DS.hasMany('medium', { async: false })
    });

    Medium = Ember.Mixin.create();
    Video = Model.extend(Medium);

    env = setupStore({
      user: User,
      person: Person,
      message: Message,
      post: Post,
      video: Video
    });

    env.registry.register('mixin:medium', Medium);
  },

  afterEach() {
    Ember.run(env.container, 'destroy');
  }
});

testInDebug('assertPolymorphicType works for subclasses', function(assert) {
  let user, post, person;

  Ember.run(() => {
    env.store.push({
      data: [{
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: []
          }
        }
      }, {
        type: 'post',
        id: '1'
      }, {
        type: 'person',
        id: '1'
      }]
    });

    user = env.store.peekRecord('user', 1);
    post = env.store.peekRecord('post', 1);
    person = env.store.peekRecord('person', 1);
  });

  let relationship = user.relationshipFor('messages');
  user = user._internalModel;
  post = post._internalModel;
  person = person._internalModel;

  try {
    assertPolymorphicType(user, relationship, post);
  } catch (e) {
    assert.ok(false, 'should not throw an error');
  }

  assert.expectAssertion(() => {
    assertPolymorphicType(user, relationship, person);
  }, "You cannot add a record of modelClass 'person' to the 'user.messages' relationship (only 'message' allowed)");
});

test('modelHasAttributeOrRelationshipNamedType', function(assert) {
  let ModelWithTypeAttribute = Model.extend({
    type: DS.attr()
  });
  let ModelWithTypeBelongsTo = Model.extend({
    type: DS.belongsTo()
  });
  let ModelWithTypeHasMany = Model.extend({
    type: DS.hasMany()
  });

  assert.equal(modelHasAttributeOrRelationshipNamedType(Model), false);

  assert.equal(modelHasAttributeOrRelationshipNamedType(ModelWithTypeAttribute), true);
  assert.equal(modelHasAttributeOrRelationshipNamedType(ModelWithTypeBelongsTo), true);
  assert.equal(modelHasAttributeOrRelationshipNamedType(ModelWithTypeHasMany), true);
});

testInDebug('assertPolymorphicType works for mixins', function(assert) {
  let post, video, person;

  Ember.run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1'
      }, {
        type: 'video',
        id: '1'
      }, {
        type: 'person',
        id: '1'
      }]
    });
    post = env.store.peekRecord('post', 1);
    video = env.store.peekRecord('video', 1);
    person = env.store.peekRecord('person', 1);
  });

  let relationship = post.relationshipFor('medias');
  post = post._internalModel;
  video = video._internalModel;
  person = person._internalModel;

  try {
    assertPolymorphicType(post, relationship, video);
  } catch (e) {
    assert.ok(false, 'should not throw an error');
  }

  assert.expectAssertion(() => {
    assertPolymorphicType(post, relationship, person);
  }, "You cannot add a record of modelClass 'person' to the 'post.medias' relationship (only 'medium' allowed)");
});
