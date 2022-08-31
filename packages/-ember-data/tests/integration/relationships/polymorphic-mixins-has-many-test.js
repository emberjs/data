import Mixin from '@ember/object/mixin';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module(
  'integration/relationships/polymorphic_mixins_has_many_test - Polymorphic hasMany relationships with mixins',
  function (hooks) {
    setupTest(hooks);
    class User extends Model {
      @attr name;
      @hasMany('message', { async: true, inverse: 'user', polymorphic: true }) messages;
    }

    const Message = Mixin.create({
      title: attr('string'),
      user: belongsTo('user', { async: true, inverse: 'messages', as: 'message' }),
    });

    class Video extends Model.extend(Message) {
      @attr video;
    }
    class NotMessage extends Model {
      @attr video;
    }

    hooks.beforeEach(function () {
      this.owner.register('model:user', User);
      this.owner.register('model:video', Video);
      this.owner.register('model:not-message', NotMessage);

      this.owner.register('mixin:message', Message);

      this.owner.register('adapter:application', Adapter.extend());
      this.owner.register('serializer:application', class extends JSONAPISerializer {});
    });

    /*
    Server loading tests
  */

    test('Relationship is available from the belongsTo side even if only loaded from the hasMany side - async', async function (assert) {
      const store = this.owner.lookup('service:store');

      const [user, video] = store.push({
        data: [
          {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Stanley',
            },
            relationships: {
              messages: {
                data: [{ type: 'video', id: '2' }],
              },
            },
          },
          {
            type: 'video',
            id: '2',
            attributes: {
              video: 'Here comes Youtube',
            },
          },
        ],
      });

      const messages = await user.messages;
      assert.strictEqual(messages.at(0), video, 'The hasMany has loaded correctly');
      const fetchedUser = await messages.at(0).user;
      assert.strictEqual(fetchedUser, user, 'The inverse was setup correctly');
    });

    /*
    Local edits
  */
    test('Pushing to the hasMany reflects the change on the belongsTo side - async', async function (assert) {
      const store = this.owner.lookup('service:store');

      const [user, video] = store.push({
        data: [
          {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Stanley',
            },
            relationships: {
              messages: {
                data: [],
              },
            },
          },
          {
            type: 'video',
            id: '2',
            attributes: {
              video: 'Here comes Youtube',
            },
          },
        ],
      });

      const fetchedMessages = await user.messages;
      fetchedMessages.push(video);
      const fetchedUser = await video.user;
      assert.strictEqual(fetchedUser, user, 'user got set correctly');
    });

    test('NATIVE CLASSES: Pushing to the hasMany reflects the change on the belongsTo side - async', async function (assert) {
      class Video extends Model.extend(Message) {}

      this.owner.register('model:video', Video);

      const store = this.owner.lookup('service:store');

      const [user, video] = store.push({
        data: [
          {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Stanley',
            },
            relationships: {
              messages: {
                data: [],
              },
            },
          },
          {
            type: 'video',
            id: '2',
            attributes: {
              video: 'Here comes Youtube',
            },
          },
        ],
      });

      const fetchedMessages = await user.messages;
      fetchedMessages.push(video);
      const fetchedUser = await video.user;
      assert.strictEqual(fetchedUser, user, 'user got set correctly');
    });

    /*
    Local edits
  */
    testInDebug(
      'Pushing a an object that does not implement the mixin to the mixin accepting array errors out',
      async function (assert) {
        const store = this.owner.lookup('service:store');

        const [user, notMessage] = store.push({
          data: [
            {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Stanley',
              },
              relationships: {
                messages: {
                  data: [],
                },
              },
            },
            {
              type: 'not-message',
              id: '2',
              attributes: {
                video: 'Here comes Youtube',
              },
            },
          ],
        });

        const fetchedMessages = await user.messages;
        assert.expectAssertion(function () {
          fetchedMessages.push(notMessage);
        }, /The 'not-message' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message/);
      }
    );

    test('Pushing to the hasMany reflects the change on the belongsTo side - model injections true', async function (assert) {
      const store = this.owner.lookup('service:store');

      const [user, video] = store.push({
        data: [
          {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Stanley',
            },
            relationships: {
              messages: {
                data: [],
              },
            },
          },
          {
            type: 'video',
            id: '2',
            attributes: {
              video: 'Here comes Youtube',
            },
          },
        ],
      });

      const fetchedMessages = await user.messages;
      fetchedMessages.push(video);
      const fetchedUser = await video.user;
      assert.strictEqual(fetchedUser, user, 'user got set correctly');
    });

    /*
    Local edits
  */
    testInDebug(
      'Pushing a an object that does not implement the mixin to the mixin accepting array errors out - model injections true',
      async function (assert) {
        const store = this.owner.lookup('service:store');

        const [user, notMessage] = store.push({
          data: [
            {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Stanley',
              },
              relationships: {
                messages: {
                  data: [],
                },
              },
            },
            {
              type: 'not-message',
              id: '2',
              attributes: {
                video: 'Here comes Youtube',
              },
            },
          ],
        });

        const fetchedMessages = await user.messages;
        assert.expectAssertion(function () {
          fetchedMessages.push(notMessage);
        }, /The 'not-message' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message'/);
      }
    );
  }
);
