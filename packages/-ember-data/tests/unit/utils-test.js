import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { modelHasAttributeOrRelationshipNamedType } from '@ember-data/serializer/-private';
import { recordIdentifierFor } from '@ember-data/store';
import { assertPolymorphicType } from '@ember-data/store/-debug';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/utils', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend();
    const User = Model.extend({
      messages: hasMany('message', { async: false }),
    });

    const Message = Model.extend();
    const Post = Message.extend({
      medias: hasMany('medium', { async: false }),
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

  testInDebug('assertPolymorphicType works for subclasses', function (assert) {
    let store = this.owner.lookup('service:store');
    let [user, post, person] = store.push({
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

    let relationship = user.relationshipFor('messages');
    user = recordIdentifierFor(user);
    post = recordIdentifierFor(post);
    person = recordIdentifierFor(person);

    try {
      assertPolymorphicType(user, relationship, post, store);
    } catch (e) {
      assert.ok(false, 'should not throw an error');
    }

    assert.expectAssertion(() => {
      assertPolymorphicType(user, relationship, person, store);
    }, "The 'person' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message' or use a mixin of the same name.");
  });

  test('modelHasAttributeOrRelationshipNamedType', function (assert) {
    class Blank extends Model {}
    class ModelWithTypeAttribute extends Model {
      @attr type;
    }
    class ModelWithTypeBelongsTo extends Model {
      @belongsTo type;
    }
    class ModelWithTypeHasMany extends Model {
      @hasMany type;
    }
    this.owner.register('model:blank', Blank);
    this.owner.register('model:with-attr', ModelWithTypeAttribute);
    this.owner.register('model:with-belongs-to', ModelWithTypeBelongsTo);
    this.owner.register('model:with-has-many', ModelWithTypeHasMany);
    const store = this.owner.lookup('service:store');

    assert.false(modelHasAttributeOrRelationshipNamedType(store.modelFor('blank')));

    assert.true(modelHasAttributeOrRelationshipNamedType(store.modelFor('with-attr')));
    assert.true(modelHasAttributeOrRelationshipNamedType(store.modelFor('with-belongs-to')));
    assert.true(modelHasAttributeOrRelationshipNamedType(store.modelFor('with-has-many')));
  });

  testInDebug('assertPolymorphicType works for mixins', function (assert) {
    let store = this.owner.lookup('service:store');
    let [post, video, person] = store.push({
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

    let relationship = post.relationshipFor('medias');
    post = recordIdentifierFor(post);
    video = recordIdentifierFor(video);
    person = recordIdentifierFor(person);

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
