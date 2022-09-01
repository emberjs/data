import { DEBUG } from '@glimmer/env';

import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo } from '@ember-data/model';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

function stringify(string) {
  return function () {
    return string;
  };
}

module('integration/inverse-test - inverseFor', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    let { owner } = this;
    store = owner.lookup('service:store');
  });

  deprecatedTest(
    'Finds the inverse when there is only one possible available',
    { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 2 },
    function (assert) {
      class User extends Model {
        @attr()
        name;

        @belongsTo('user', { async: true, inverse: null })
        bestFriend;

        @belongsTo('job', { async: false })
        job;

        toString() {
          return stringify('user');
        }
      }

      class Job extends Model {
        @attr()
        isGood;

        @belongsTo('user', { async: false })
        user;

        toString() {
          return stringify('job');
        }
      }

      let { owner } = this;
      owner.register('model:user', User);
      owner.register('model:job', Job);

      let job = store.modelFor('job');
      let user = store.modelFor('user');
      let inverseDefinition = job.inverseFor('user', store);

      assert.deepEqual(
        inverseDefinition,
        {
          type: user,
          name: 'job',
          kind: 'belongsTo',
          options: {
            async: false,
          },
        },
        'Gets correct type, name and kind'
      );
    }
  );

  deprecatedTest(
    'Finds the inverse when only one side has defined it manually',
    { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 3 },
    function (assert) {
      class User extends Model {
        @attr()
        name;

        @belongsTo('user', { async: true, inverse: null })
        bestFriend;

        @belongsTo('job', { async: false })
        job;

        @belongsTo('job', { async: false })
        previousJob;

        toString() {
          return stringify('user');
        }
      }

      class Job extends Model {
        @attr()
        isGood;

        @belongsTo('user', { async: false })
        user;

        @belongsTo('user', { inverse: 'previousJob', async: false })
        owner;

        toString() {
          return stringify('job');
        }
      }

      let { owner } = this;
      owner.register('model:user', User);
      owner.register('model:job', Job);

      let job = store.modelFor('job');
      let user = store.modelFor('user');

      assert.deepEqual(
        job.inverseFor('owner', store),
        {
          type: user, //the model's type
          name: 'previousJob', //the models relationship key
          kind: 'belongsTo',
          options: {
            async: false,
          },
        },
        'Gets correct type, name and kind'
      );

      assert.deepEqual(
        user.inverseFor('previousJob', store),
        {
          type: job, //the model's type
          name: 'owner', //the models relationship key
          kind: 'belongsTo',
          options: {
            inverse: 'previousJob',
            async: false,
          },
        },
        'Gets correct type, name and kind'
      );
    }
  );

  deprecatedTest(
    'Returns null if inverse relationship it is manually set with a different relationship key',
    { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 1 },
    function (assert) {
      class User extends Model {
        @attr()
        name;

        @belongsTo('user', { async: true, inverse: null })
        bestFriend;

        @belongsTo('job', { async: false })
        job;

        toString() {
          return stringify('user');
        }
      }

      class Job extends Model {
        @attr()
        isGood;

        @belongsTo('user', { inverse: 'previousJob', async: false })
        user;

        toString() {
          return stringify('job');
        }
      }

      let { owner } = this;
      owner.register('model:user', User);
      owner.register('model:job', Job);

      let user = store.modelFor('user');
      assert.strictEqual(user.inverseFor('job', store), null, 'There is no inverse');
    }
  );

  if (DEBUG) {
    deprecatedTest(
      'Errors out if you define 2 inverses to the same model',
      { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 1 },
      function (assert) {
        class User extends Model {
          @attr()
          name;

          @belongsTo('user', { async: true, inverse: null })
          bestFriend;

          @belongsTo('job', { async: false })
          job;

          toString() {
            return stringify('user');
          }
        }

        class Job extends Model {
          @attr()
          isGood;

          @belongsTo('user', { inverse: 'job', async: false })
          user;

          @belongsTo('user', { inverse: 'job', async: false })
          owner;

          toString() {
            return stringify('job');
          }
        }
        let { owner } = this;
        owner.register('model:user', User);
        owner.register('model:job', Job);

        let user = store.modelFor('user');
        assert.expectAssertion(() => {
          user.inverseFor('job', store);
        }, /Assertion Failed: You defined the 'job' relationship on model:user, but you defined the inverse relationships of type model:job multiple times/i);
      }
    );
  }

  deprecatedTest(
    'Caches findInverseFor return value',
    { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 2 },
    function (assert) {
      assert.expect(1);
      class User extends Model {
        @attr()
        name;

        @belongsTo('user', { async: true, inverse: null })
        bestFriend;

        @belongsTo('job', { async: false })
        job;

        toString() {
          return stringify('user');
        }
      }

      class Job extends Model {
        @attr()
        isGood;

        @belongsTo('user', { async: false })
        user;

        toString() {
          return stringify('job');
        }
      }
      let { owner } = this;
      owner.register('model:user', User);
      owner.register('model:job', Job);

      let job = store.modelFor('job');

      let inverseForUser = job.inverseFor('user', store);
      job.findInverseFor = function () {
        assert.ok(false, 'Find is not called anymore');
      };

      assert.strictEqual(inverseForUser, job.inverseFor('user', store), 'Inverse cached succesfully');
    }
  );

  if (DEBUG) {
    deprecatedTest(
      'Errors out if you do not define an inverse for a reflexive relationship',
      { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 1 },
      function (assert) {
        class ReflexiveModel extends Model {
          @belongsTo('reflexive-model', { async: false })
          reflexiveProp;

          toString() {
            return stringify('reflexiveModel');
          }
        }

        let { owner } = this;
        owner.register('model:reflexive-model', ReflexiveModel);

        //Maybe store is evaluated lazily, so we need this :(
        assert.expectWarning(() => {
          const reflexiveModel = store.push({
            data: {
              type: 'reflexive-model',
              id: '1',
            },
          });
          reflexiveModel.reflexiveProp;
        }, /Detected a reflexive relationship named 'reflexiveProp' on the schema for 'reflexive-model' without an inverse option/);
      }
    );
  }
});
