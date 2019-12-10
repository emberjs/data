import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';
import { modelHasAttributeOrRelationshipNamedType } from '@ember-data/serializer/-private';
import { assertPolymorphicType } from '@ember-data/store/-debug';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/utils', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const Person = Model.extend();
    const User = Model.extend({
      messages: DS.hasMany('message', { async: false }),
    });

    const Message = Model.extend();
    const Post = Message.extend({
      medias: DS.hasMany('medium', { async: false }),
    });

    const Medium = Mixin.create();
    const Video = Model.extend(Medium);

    this.owner.register('model:person', Person);
    this.owner.register('model:user', User);
    this.owner.register('model:message', Message);
    this.owner.register('model:post', Post);
    this.owner.register('model:video', Video);

    this.owner.register('mixin:medium', Medium);
  });

  testInDebug('assertPolymorphicType works for subclasses', function(assert) {
    let user, post, person;
    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: [
          {
            type: 'user',
            id: '1',
            relationships: {
              messages: {
                data: [],
              },
            },
          },
          {
            type: 'post',
            id: '1',
          },
          {
            type: 'person',
            id: '1',
          },
        ],
      });

      user = store.peekRecord('user', 1);
      post = store.peekRecord('post', 1);
      person = store.peekRecord('person', 1);
    });

    let relationship = user.relationshipFor('messages');
    user = user._internalModel;
    post = post._internalModel;
    person = person._internalModel;

    try {
      assertPolymorphicType(user, relationship, post, store);
    } catch (e) {
      assert.ok(false, 'should not throw an error');
    }

    assert.expectAssertion(() => {
      assertPolymorphicType(user, relationship, person, store);
    }, "The 'person' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message' or use a mixin of the same name.");
  });

  test('modelHasAttributeOrRelationshipNamedType', function(assert) {
    let ModelWithTypeAttribute = Model.extend({
      type: DS.attr(),
    });
    let ModelWithTypeBelongsTo = Model.extend({
      type: DS.belongsTo(),
    });
    let ModelWithTypeHasMany = Model.extend({
      type: DS.hasMany(),
    });

    assert.equal(modelHasAttributeOrRelationshipNamedType(Model), false);

    assert.equal(modelHasAttributeOrRelationshipNamedType(ModelWithTypeAttribute), true);
    assert.equal(modelHasAttributeOrRelationshipNamedType(ModelWithTypeBelongsTo), true);
    assert.equal(modelHasAttributeOrRelationshipNamedType(ModelWithTypeHasMany), true);
  });

  testInDebug('assertPolymorphicType works for mixins', function(assert) {
    let post, video, person;
    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: [
          {
            type: 'post',
            id: '1',
          },
          {
            type: 'video',
            id: '1',
          },
          {
            type: 'person',
            id: '1',
          },
        ],
      });
      post = store.peekRecord('post', 1);
      video = store.peekRecord('video', 1);
      person = store.peekRecord('person', 1);
    });

    let relationship = post.relationshipFor('medias');
    post = post._internalModel;
    video = video._internalModel;
    person = person._internalModel;

    try {
      assertPolymorphicType(post, relationship, video, store);
    } catch (e) {
      assert.ok(false, 'should not throw an error');
    }

    assert.expectAssertion(() => {
      assertPolymorphicType(post, relationship, person, store);
    }, "The 'person' type does not implement 'medium' and thus cannot be assigned to the 'medias' relationship in 'post'. Make it a descendant of 'medium' or use a mixin of the same name.");
  });
});
