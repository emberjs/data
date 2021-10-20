import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';

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
      const User = Model.extend({
        name: attr('string'),
        bestMessage: belongsTo('message', { async: true, polymorphic: true }),
      });

      const Message = Mixin.create({
        title: attr('string'),
        user: belongsTo('user', { async: true }),
      });

      const NotMessage = Model.extend({ video: attr() });
      const Video = Model.extend(Message, { video: attr() });

      this.owner.register('model:user', User);
      this.owner.register('model:video', Video);
      this.owner.register('model:not-message', NotMessage);

      this.owner.register('mixin:message', Message);

      this.owner.register('adapter:application', Adapter.extend());
      this.owner.register('serializer:application', JSONAPISerializer.extend());
    });

    /*
    Server loading tests
  */

    test('Relationship is available from the belongsTo side even if only loaded from the inverse side - async', function (assert) {
      let store = this.owner.lookup('service:store');

      var user, video;
      run(function () {
        store.push({
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
        user = store.peekRecord('user', 1);
        video = store.peekRecord('video', 2);
      });
      run(function () {
        user.get('bestMessage').then(function (message) {
          assert.strictEqual(message, video, 'The message was loaded correctly');
          message.get('user').then(function (fetchedUser) {
            assert.strictEqual(fetchedUser, user, 'The inverse was setup correctly');
          });
        });
      });
    });

    /*
    Local edits
  */
    test('Setting the polymorphic belongsTo gets propagated to the inverse side - async', function (assert) {
      let store = this.owner.lookup('service:store');

      var user, video;
      run(function () {
        store.push({
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
        user = store.peekRecord('user', 1);
        video = store.peekRecord('video', 2);
      });

      run(function () {
        user.set('bestMessage', video);
        video.get('user').then(function (fetchedUser) {
          assert.strictEqual(fetchedUser, user, 'user got set correctly');
        });
        user.get('bestMessage').then(function (message) {
          assert.strictEqual(message, video, 'The message was set correctly');
        });
      });
    });

    testInDebug(
      'Setting the polymorphic belongsTo with an object that does not implement the mixin errors out',
      function (assert) {
        let store = this.owner.lookup('service:store');

        var user, video;
        run(function () {
          store.push({
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
          user = store.peekRecord('user', 1);
          video = store.peekRecord('not-message', 2);
        });

        run(function () {
          assert.expectAssertion(function () {
            user.set('bestMessage', video);
          }, /The 'not-message' type does not implement 'message' and thus cannot be assigned to the 'bestMessage' relationship in 'user'. Make it a descendant of 'message'/);
        });
      }
    );

    test('Setting the polymorphic belongsTo gets propagated to the inverse side - model injections true', function (assert) {
      assert.expect(2);

      let store = this.owner.lookup('service:store');

      var user, video;
      run(function () {
        store.push({
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
        user = store.peekRecord('user', 1);
        video = store.peekRecord('video', 2);
      });

      run(function () {
        user.set('bestMessage', video);
        video.get('user').then(function (fetchedUser) {
          assert.strictEqual(fetchedUser, user, 'user got set correctly');
        });
        user.get('bestMessage').then(function (message) {
          assert.strictEqual(message, video, 'The message was set correctly');
        });
      });
    });

    testInDebug(
      'Setting the polymorphic belongsTo with an object that does not implement the mixin errors out - model injections true',
      function (assert) {
        let store = this.owner.lookup('service:store');

        var user, video;
        run(function () {
          store.push({
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
          user = store.peekRecord('user', 1);
          video = store.peekRecord('not-message', 2);
        });

        run(function () {
          assert.expectAssertion(function () {
            user.set('bestMessage', video);
          }, /The 'not-message' type does not implement 'message' and thus cannot be assigned to the 'bestMessage' relationship in 'user'. Make it a descendant of 'message'/);
        });
      }
    );
  }
);
