import Mixin from '@ember/object/mixin';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module(
  'integration/relationships/polymorphic_mixins_belongs_to_test - Polymorphic belongsTo relationships with mixins',
  function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      class User extends Model {
        @attr name;
        @belongsTo('message', { async: true, inverse: 'user', polymorphic: true }) bestMessage;
      }

      const Message = Mixin.create({
        title: attr('string'),
        user: belongsTo('user', { async: true, inverse: 'bestMessage', as: 'message' }),
      });

      class NotMessage extends Model {
        @attr video;
      }

      class Video extends Model.extend(Message) {
        @attr video;
      }

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

    test('Relationship is available from the belongsTo side even if only loaded from the inverse side - async', async function (assert) {
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
              bestMessage: {
                data: { type: 'video', id: '2' },
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

      const message = await user.bestMessage;
      assert.strictEqual(message, video, 'The message was loaded correctly');
      const fetchedUser = await message.user;
      assert.strictEqual(fetchedUser, user, 'The inverse was setup correctly');
    });

    /*
    Local edits
  */
    test('Setting the polymorphic belongsTo gets propagated to the inverse side - async', async function (assert) {
      const store = this.owner.lookup('service:store');

      const [user, video] = store.push({
        data: [
          {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Stanley',
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

      user.bestMessage = video;
      const fetchedUser = await video.user;
      assert.strictEqual(fetchedUser, user, 'user got set correctly');
      const message = await user.bestMessage;
      assert.strictEqual(message, video, 'The message was set correctly');
    });

    testInDebug(
      'Setting the polymorphic belongsTo with an object that does not implement the mixin errors out',
      function (assert) {
        const store = this.owner.lookup('service:store');

        const [user, video] = store.push({
          data: [
            {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Stanley',
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

        assert.expectAssertion(function () {
          user.bestMessage = video;
        }, /The 'not-message' type does not implement 'message' and thus cannot be assigned to the 'bestMessage' relationship in 'user'. Make it a descendant of 'message'/);
      }
    );
  }
);
