import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';

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

    let Message;

    hooks.beforeEach(function () {
      const User = Model.extend({
        name: attr('string'),
        messages: hasMany('message', { async: true, polymorphic: true }),
      });

      Message = Mixin.create({
        title: attr('string'),
        user: belongsTo('user', { async: true }),
      });

      const Video = Model.extend(Message, { video: attr() });
      const NotMessage = Model.extend({ video: attr() });

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

    test('Relationship is available from the belongsTo side even if only loaded from the hasMany side - async', function (assert) {
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
        user = store.peekRecord('user', 1);
        video = store.peekRecord('video', 2);
      });
      run(function () {
        user.get('messages').then(function (messages) {
          assert.strictEqual(messages.objectAt(0), video, 'The hasMany has loaded correctly');
          messages
            .objectAt(0)
            .get('user')
            .then(function (fetchedUser) {
              assert.strictEqual(fetchedUser, user, 'The inverse was setup correctly');
            });
        });
      });
    });

    /*
    Local edits
  */
    test('Pushing to the hasMany reflects the change on the belongsTo side - async', function (assert) {
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
        user = store.peekRecord('user', 1);
        video = store.peekRecord('video', 2);
      });

      run(function () {
        user.get('messages').then(function (fetchedMessages) {
          fetchedMessages.pushObject(video);
          video.get('user').then(function (fetchedUser) {
            assert.strictEqual(fetchedUser, user, 'user got set correctly');
          });
        });
      });
    });

    test('NATIVE CLASSES: Pushing to the hasMany reflects the change on the belongsTo side - async', function (assert) {
      class Video extends Model.extend(Message) {}

      this.owner.register('model:video', Video);

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
        user = store.peekRecord('user', 1);
        video = store.peekRecord('video', 2);
      });

      run(function () {
        user.get('messages').then(function (fetchedMessages) {
          fetchedMessages.pushObject(video);
          video.get('user').then(function (fetchedUser) {
            assert.strictEqual(fetchedUser, user, 'user got set correctly');
          });
        });
      });
    });

    /*
    Local edits
  */
    testInDebug(
      'Pushing a an object that does not implement the mixin to the mixin accepting array errors out',
      function (assert) {
        let store = this.owner.lookup('service:store');

        var user, notMessage;
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
          user = store.peekRecord('user', 1);
          notMessage = store.peekRecord('not-message', 2);
        });

        run(function () {
          user.get('messages').then(function (fetchedMessages) {
            assert.expectAssertion(function () {
              fetchedMessages.pushObject(notMessage);
            }, /The 'not-message' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message/);
          });
        });
      }
    );

    test('Pushing to the hasMany reflects the change on the belongsTo side - model injections true', function (assert) {
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
        user = store.peekRecord('user', 1);
        video = store.peekRecord('video', 2);
      });

      run(function () {
        user.get('messages').then(function (fetchedMessages) {
          fetchedMessages.pushObject(video);
          video.get('user').then(function (fetchedUser) {
            assert.strictEqual(fetchedUser, user, 'user got set correctly');
          });
        });
      });
    });

    /*
    Local edits
  */
    testInDebug(
      'Pushing a an object that does not implement the mixin to the mixin accepting array errors out - model injections true',
      function (assert) {
        let store = this.owner.lookup('service:store');

        var user, notMessage;
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
          user = store.peekRecord('user', 1);
          notMessage = store.peekRecord('not-message', 2);
        });

        run(function () {
          user.get('messages').then(function (fetchedMessages) {
            assert.expectAssertion(function () {
              fetchedMessages.pushObject(notMessage);
            }, /The 'not-message' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message'/);
          });
        });
      }
    );
  }
);
