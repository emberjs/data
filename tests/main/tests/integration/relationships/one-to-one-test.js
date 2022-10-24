import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/relationships/one_to_one_test - OneToOne relationships', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const User = Model.extend({
      name: attr('string'),
      bestFriend: belongsTo('user', { async: true, inverse: 'bestFriend' }),
      job: belongsTo('job', { async: false, inverse: 'user' }),
    });

    const Job = Model.extend({
      name: attr(),
      isGood: attr(),
      user: belongsTo('user', { async: false, inverse: 'job' }),
    });

    const ApplicationAdapter = Adapter.extend({
      deleteRecord: () => resolve(),
    });

    const ApplicationSerializer = class extends JSONAPISerializer {};

    this.owner.register('model:user', User);
    this.owner.register('model:job', Job);

    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', ApplicationSerializer);
  });

  /*
    Server loading tests
  */

  test('Relationship is available from both sides even if only loaded from one side - async', function (assert) {
    let store = this.owner.lookup('service:store');

    var stanley, stanleysFriend;
    run(function () {
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            bestFriend: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
      stanleysFriend = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: "Stanley's friend",
          },
        },
      });

      stanleysFriend.bestFriend.then(function (fetchedUser) {
        assert.strictEqual(fetchedUser, stanley, 'User relationship was set up correctly');
      });
    });
  });

  test('Relationship is available from both sides even if only loaded from one side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    var job, user;
    run(function () {
      job = store.push({
        data: {
          id: '2',
          type: 'job',
          attributes: {
            isGood: true,
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            job: {
              data: {
                id: '2',
                type: 'job',
              },
            },
          },
        },
      });
    });
    assert.strictEqual(job.user, user, 'User relationship was set up correctly');
  });

  test('Fetching a belongsTo that is set to null removes the record from a relationship - async', function (assert) {
    let store = this.owner.lookup('service:store');

    var stanleysFriend;
    run(function () {
      stanleysFriend = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: "Stanley's friend",
          },
          relationships: {
            bestFriend: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            bestFriend: {
              data: null,
            },
          },
        },
      });
      stanleysFriend.bestFriend.then(function (fetchedUser) {
        assert.strictEqual(fetchedUser, null, 'User relationship was removed correctly');
      });
    });
  });

  test('Fetching a belongsTo that is set to null removes the record from a relationship - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    var job;
    run(function () {
      job = store.push({
        data: {
          id: '2',
          type: 'job',
          attributes: {
            isGood: true,
          },
        },
      });
      store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            job: {
              data: {
                id: '2',
                type: 'job',
              },
            },
          },
        },
      });
    });
    run(function () {
      job = store.push({
        data: {
          id: '2',
          type: 'job',
          attributes: {
            isGood: true,
          },
          relationships: {
            user: {
              data: null,
            },
          },
        },
      });
    });
    assert.strictEqual(job.user, null, 'User relationship was removed correctly');
  });

  test('Fetching a belongsTo that is set to a different record, sets the old relationship to null - async', async function (assert) {
    let store = this.owner.lookup('service:store');

    let user1 = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: { name: 'Igor' },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    let user2 = store.peekRecord('user', '2');
    let user1Friend = await user1.bestFriend;

    assert.strictEqual(user1Friend, user2, '<user:1>.bestFriend is <user:2>');

    /*
      Now we "reload" <user:2> but with a new bestFriend. While this only gives
      us new canonical information for <user:2> and <user:3>, it also severs
      the previous canonical relationship with <user:1>. We infer from this
      that the new canonical state for <user:1>.bestFriend is `null`.

      Users for whom this is not true should either

      - include information for user:1 in the payload severing this link
      - manually reload user:1 or use the belongsToReference to reload user:1.bestFriend
     */
    store.push({
      data: {
        type: 'user',
        id: '2',
        attributes: { name: 'Igor' },
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '3' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '3',
          attributes: { name: 'Evan' },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '2' },
            },
          },
        },
      ],
    });

    let user3 = store.peekRecord('user', '3');
    let user1bestFriend = await user1.bestFriend;
    let user2bestFriend = await user2.bestFriend;
    let user3bestFriend = await user3.bestFriend;

    assert.strictEqual(user3bestFriend, user2, '<user:3>.bestFriend is <user:2>');
    assert.strictEqual(user2bestFriend, user3, '<user:2>.bestFriend is <user:3>');
    assert.strictEqual(user1bestFriend, null, '<user:1>.bestFriend is null');

    let user1bestFriendState = user1.belongsTo('bestFriend').belongsToRelationship;

    assert.strictEqual(user1bestFriendState.remoteState, null, '<user:1>.job is canonically empty');
    assert.strictEqual(user1bestFriendState.localState, null, '<user:1>.job is locally empty');
    assert.true(user1bestFriendState.state.isEmpty, 'The relationship is empty');
    assert.false(user1bestFriendState.state.isStale, 'The relationship is not stale');
    assert.false(user1bestFriendState.state.shouldForceReload, 'The relationship does not require reload');
    assert.true(user1bestFriendState.state.hasReceivedData, 'The relationship considers its canonical data complete');
  });

  test('Fetching a belongsTo that is set to a different record, sets the old relationship to null - sync', async function (assert) {
    let store = this.owner.lookup('service:store');

    let user1 = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          job: {
            data: { type: 'job', id: '1' },
          },
        },
      },
      included: [
        {
          type: 'job',
          id: '1',
          attributes: { name: 'Golf Picker Mechanic' },
          relationships: {
            user: {
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    let job1 = store.peekRecord('job', '1');

    assert.strictEqual(user1.job, job1, '<user:1>.job is <job:1>');

    /*
      Now we "reload" <job:1> but with a new user. While this only gives
      us new canonical information for <job:1> and <user:2>, it also severs
      the previous canonical relationship with <user:1>. We infer from this
      that the new canonical state for <user:1>.job is `null`.

      Users for whom this is not true should either

      - include information for user:1 in the payload severing this link
      - manually reload user:1 or use the belongsToReference to reload user:1.job
     */
    store.push({
      data: {
        type: 'job',
        id: '1',
        attributes: { name: 'Golf Picker Mechanic' },
        relationships: {
          user: {
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: { name: 'Evan' },
          relationships: {
            job: {
              data: { type: 'job', id: '1' },
            },
          },
        },
      ],
    });

    let user2 = store.peekRecord('user', '2');

    assert.strictEqual(user2.job, job1, '<user:2>.job is <job:1>');
    assert.strictEqual(job1.user, user2, '<job:1>.user is <user:2>');
    assert.strictEqual(user1.job, null, '<user:1>.job is null');

    let user1JobState = user1.belongsTo('job').belongsToRelationship;

    assert.strictEqual(user1JobState.remoteState, null, '<user:1>.job is canonically empty');
    assert.strictEqual(user1JobState.localState, null, '<user:1>.job is locally empty');
    assert.true(user1JobState.state.isEmpty, 'The relationship is empty');
    assert.false(user1JobState.state.isStale, 'The relationship is not stale');
    assert.false(user1JobState.state.shouldForceReload, 'The relationship does not require reload');
    assert.true(user1JobState.state.hasReceivedData, 'The relationship considers its canonical data complete');
  });

  /*
    Local edits
  */

  test('Setting a OneToOne relationship reflects correctly on the other side- async', function (assert) {
    let store = this.owner.lookup('service:store');

    var stanley, stanleysFriend;
    run(function () {
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      stanleysFriend = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: "Stanley's friend",
          },
        },
      });
    });
    run(function () {
      stanley.set('bestFriend', stanleysFriend);
      stanleysFriend.bestFriend.then(function (fetchedUser) {
        assert.strictEqual(fetchedUser, stanley, 'User relationship was updated correctly');
      });
    });
  });

  test('Setting a OneToOne relationship reflects correctly on the other side- sync', function (assert) {
    let store = this.owner.lookup('service:store');

    var job, user;
    run(function () {
      job = store.push({
        data: {
          id: '2',
          type: 'job',
          attributes: {
            isGood: true,
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
    });
    run(function () {
      user.set('job', job);
    });
    assert.strictEqual(job.user, user, 'User relationship was set up correctly');
  });

  deprecatedTest(
    'Setting a BelongsTo to a promise unwraps the promise before setting- async',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0', count: 1 },
    function (assert) {
      let store = this.owner.lookup('service:store');

      var stanley, stanleysFriend, newFriend;
      run(function () {
        stanley = store.push({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'Stanley',
            },
            relationships: {
              bestFriend: {
                data: {
                  id: '2',
                  type: 'user',
                },
              },
            },
          },
        });
        stanleysFriend = store.push({
          data: {
            id: '2',
            type: 'user',
            attributes: {
              name: "Stanley's friend",
            },
          },
        });
        newFriend = store.push({
          data: {
            id: '3',
            type: 'user',
            attributes: {
              name: 'New friend',
            },
          },
        });
      });
      run(function () {
        newFriend.set('bestFriend', stanleysFriend.bestFriend);
        stanley.bestFriend.then(function (fetchedUser) {
          assert.strictEqual(
            fetchedUser,
            newFriend,
            `Stanley's bestFriend relationship was updated correctly to newFriend`
          );
        });
        newFriend.bestFriend.then(function (fetchedUser) {
          assert.strictEqual(
            fetchedUser,
            stanley,
            `newFriend's bestFriend relationship was updated correctly to be Stanley`
          );
        });
      });
    }
  );

  deprecatedTest(
    'Setting a BelongsTo to a promise works when the promise returns null- async',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0', count: 1 },
    function (assert) {
      let store = this.owner.lookup('service:store');

      var igor, newFriend;
      run(function () {
        store.push({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'Stanley',
            },
          },
        });
        igor = store.push({
          data: {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Igor',
            },
          },
        });
        newFriend = store.push({
          data: {
            id: '3',
            type: 'user',
            attributes: {
              name: 'New friend',
            },
            relationships: {
              bestFriend: {
                data: {
                  id: '1',
                  type: 'user',
                },
              },
            },
          },
        });
      });
      run(function () {
        newFriend.set('bestFriend', igor.bestFriend);
        newFriend.bestFriend.then(function (fetchedUser) {
          assert.strictEqual(fetchedUser, null, 'User relationship was updated correctly');
        });
      });
    }
  );

  testInDebug("Setting a BelongsTo to a promise that didn't come from a relationship errors out", function (assert) {
    let store = this.owner.lookup('service:store');

    var stanley, igor;
    run(function () {
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            bestFriend: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
      igor = store.push({
        data: {
          id: '3',
          type: 'user',
          attributes: {
            name: 'Igor',
          },
        },
      });
    });

    assert.expectAssertion(function () {
      run(function () {
        stanley.set('bestFriend', resolve(igor));
      });
    }, /You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call./);
  });

  deprecatedTest(
    'Setting a BelongsTo to a promise multiple times is resistant to race conditions when the first set resolves quicker',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0', count: 2 },
    async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');

      const stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            bestFriend: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
      const igor = store.push({
        data: {
          id: '3',
          type: 'user',
          attributes: {
            name: 'Igor',
          },
          relationships: {
            bestFriend: {
              data: {
                id: '5',
                type: 'user',
              },
            },
          },
        },
      });
      const newFriend = store.push({
        data: {
          id: '7',
          type: 'user',
          attributes: {
            name: 'New friend',
          },
        },
      });

      adapter.findRecord = function (store, type, id, snapshot) {
        if (id === '5') {
          return resolve({ data: { id: '5', type: 'user', attributes: { name: "Igor's friend" } } });
        } else if (id === '2') {
          return resolve({ data: { id: '2', type: 'user', attributes: { name: "Stanley's friend" } } });
        }
      };

      let stanleyPromise = stanley.bestFriend;
      let igorPromise = igor.bestFriend;

      await Promise.all([stanleyPromise, igorPromise]);
      newFriend.bestFriend = stanleyPromise;
      newFriend.bestFriend = igorPromise;

      const fetchedUser = await newFriend.bestFriend;
      assert.strictEqual(fetchedUser?.name, "Igor's friend", 'User relationship was updated correctly');
    }
  );

  test('Setting a OneToOne relationship to null reflects correctly on the other side - async', function (assert) {
    let store = this.owner.lookup('service:store');

    var stanley, stanleysFriend;
    run(function () {
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            bestFriend: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
      stanleysFriend = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: "Stanley's friend",
          },
          relationships: {
            bestFriend: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
    });

    run(function () {
      stanley.set('bestFriend', null); // :(
      stanleysFriend.bestFriend.then(function (fetchedUser) {
        assert.strictEqual(fetchedUser, null, 'User relationship was removed correctly');
      });
    });
  });

  test('Setting a OneToOne relationship to null reflects correctly on the other side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    var job, user;
    run(function () {
      job = store.push({
        data: {
          id: '2',
          type: 'job',
          attributes: {
            isGood: false,
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            job: {
              data: {
                id: '2',
                type: 'job',
              },
            },
          },
        },
      });
    });

    run(function () {
      user.set('job', null);
    });
    assert.strictEqual(job.user, null, 'User relationship was removed correctly');
  });

  test('Setting a belongsTo to a different record, sets the old relationship to null - async', function (assert) {
    assert.expect(3);

    let store = this.owner.lookup('service:store');

    var stanley, stanleysFriend;
    run(function () {
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            bestFriend: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
      stanleysFriend = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: "Stanley's friend",
          },
          relationships: {
            bestFriend: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });

      stanleysFriend.bestFriend.then(function (fetchedUser) {
        assert.strictEqual(fetchedUser, stanley, 'User relationship was initally setup correctly');
        var stanleysNewFriend = store.push({
          data: {
            id: '3',
            type: 'user',
            attributes: {
              name: "Stanley's New friend",
            },
          },
        });

        run(function () {
          stanleysNewFriend.set('bestFriend', stanley);
        });

        stanley.bestFriend.then(function (fetchedNewFriend) {
          assert.strictEqual(fetchedNewFriend, stanleysNewFriend, 'User relationship was updated correctly');
        });

        stanleysFriend.bestFriend.then(function (fetchedOldFriend) {
          assert.strictEqual(fetchedOldFriend, null, 'The old relationship was set to null correctly');
        });
      });
    });
  });

  test('Setting a belongsTo to a different record, sets the old relationship to null - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    var job, user, newBetterJob;
    run(function () {
      job = store.push({
        data: {
          id: '2',
          type: 'job',
          attributes: {
            isGood: false,
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            job: {
              data: {
                id: '2',
                type: 'job',
              },
            },
          },
        },
      });
    });

    assert.strictEqual(job.user, user, 'Job and user initially setup correctly');

    run(function () {
      newBetterJob = store.push({
        data: {
          id: '3',
          type: 'job',
          attributes: {
            isGood: true,
          },
        },
      });

      newBetterJob.set('user', user);
    });

    assert.strictEqual(user.job, newBetterJob, 'Job updated correctly');
    assert.strictEqual(job.user, null, 'Old relationship nulled out correctly');
    assert.strictEqual(newBetterJob.user, user, 'New job setup correctly');
  });

  /*
  Rollback attributes tests
  */

  test('Rollbacking attributes of deleted record restores the relationship on both sides - async', function (assert) {
    let store = this.owner.lookup('service:store');

    var stanley, stanleysFriend;
    run(function () {
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            bestFriend: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
      stanleysFriend = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: "Stanley's friend",
          },
        },
      });
    });
    run(function () {
      stanley.deleteRecord();
    });
    run(function () {
      stanley.rollbackAttributes();
      stanleysFriend.bestFriend.then(function (fetchedUser) {
        assert.strictEqual(fetchedUser, stanley, 'Stanley got rollbacked correctly');
      });
      stanley.bestFriend.then(function (fetchedUser) {
        assert.strictEqual(fetchedUser, stanleysFriend, 'Stanleys friend did not get removed');
      });
    });
  });

  test('Rollbacking attributes of deleted record restores the relationship on both sides - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    var job, user;
    run(function () {
      job = store.push({
        data: {
          id: '2',
          type: 'job',
          attributes: {
            isGood: true,
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            job: {
              data: {
                id: '2',
                type: 'job',
              },
            },
          },
        },
      });
    });
    run(function () {
      job.deleteRecord();
      job.rollbackAttributes();
    });
    assert.strictEqual(user.job, job, 'Job got rollbacked correctly');
    assert.strictEqual(job.user, user, 'Job still has the user');
  });

  test('Rollbacking attributes of created record removes the relationship on both sides - async', async function (assert) {
    let store = this.owner.lookup('service:store');

    const stanleysFriend = store.push({
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: "Stanley's friend",
        },
      },
    });
    const stanley = store.createRecord('user', { bestFriend: stanleysFriend });

    stanley.rollbackAttributes();

    let fetchedUser = await stanleysFriend.bestFriend;
    assert.strictEqual(fetchedUser, null, 'Stanley got rollbacked correctly');
    // TODO we should figure out how to handle the fact that we disconnect things. Right now we're asserting eagerly.
    fetchedUser = await stanley.bestFriend;
    assert.strictEqual(fetchedUser, null, 'Stanleys friend did get removed');
  });

  test('Rollbacking attributes of created record removes the relationship on both sides - sync', async function (assert) {
    let store = this.owner.lookup('service:store');

    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
      },
    });
    const job = store.createRecord('job', { user: user });
    job.rollbackAttributes();
    await settled();

    assert.strictEqual(user.job, null, 'Job got rollbacked correctly');
    assert.true(job.isDestroyed, 'Job is destroyed');
  });
});
