import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import Model from 'ember-data/model';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';

module('integration/inverse-test - Model.inverseFor', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    let { owner } = this;

    class User extends Model {
      @attr
      name;
      @belongsTo('user', { async: true, inverse: null })
      bestFriend;
      @belongsTo('job', { async: false })
      job;
    }
    class Job extends Model {
      @attr
      isGood;
      @belongsTo('user', { async: false })
      user;
    }
    class ReflexiveModel extends Model {
      @belongsTo('reflexiveModel', { async: false })
      reflexiveProp;
    }
    owner.register('model:user', User);
    owner.register('model:job', Job);
    owner.register('model:reflexive-model', ReflexiveModel);

    store = owner.lookup('service:store');
  });

  test('Finds the inverse when there is only one possible available', function(assert) {
    let Job = store.modelFor('job');
    let inverseDefinition = Job.inverseFor('user', store);

    assert.deepEqual(
      inverseDefinition,
      {
        type: store.modelFor('user'),
        name: 'job',
        kind: 'belongsTo',
        options: {
          async: false,
        },
      },
      'Gets correct type, name and kind'
    );
  });

  test('Finds the inverse when only one side has defined it manually', function(assert) {
    let { owner } = this;
    owner.unregister('model:job');
    owner.unregister('model:user');

    class Job extends Model {
      @belongsTo('user', { inverse: 'previousJob', async: false })
      owner;
    }
    class User extends Model {
      @belongsTo('job', { async: false })
      previousJob;
    }
    owner.register('model:job', Job);
    owner.register('model:user', User);

    assert.deepEqual(
      store.modelFor('job').inverseFor('owner', store),
      {
        type: User, //the model's type
        name: 'previousJob', //the models relationship key
        kind: 'belongsTo',
        options: {
          async: false,
        },
      },
      'Gets correct type, name and kind'
    );

    assert.deepEqual(
      store.modelFor('user').inverseFor('previousJob', store),
      {
        type: Job, //the model's type
        name: 'owner', //the models relationship key
        kind: 'belongsTo',
        options: {
          inverse: 'previousJob',
          async: false,
        },
      },
      'Gets correct type, name and kind'
    );
  });

  test('Returns null if inverse relationship it is manually set with a different relationship key', function(assert) {
    let { owner } = this;
    owner.unregister('model:job');
    owner.unregister('model:user');

    class Job extends Model {
      @belongsTo('user', { inverse: 'previousJob', async: false })
      user;
    }
    class User extends Model {
      @belongsTo('job', { async: false })
      job;
    }
    owner.register('model:job', Job);
    owner.register('model:user', User);

    assert.equal(User.inverseFor('job', store), null, 'There is no inverse');
  });

  testInDebug('Errors out if you define 2 inverses to the same model', function(assert) {
    let { owner } = this;
    owner.unregister('model:job');
    owner.unregister('model:user');

    class Job extends Model {
      @belongsTo('user', { inverse: 'job', async: false })
      user;
      @belongsTo('user', { inverse: 'job', async: false })
      owner;
    }
    class User extends Model {
      @belongsTo('job', { async: false })
      job;
    }
    owner.register('model:job', Job);
    owner.register('model:user', User);

    assert.expectAssertion(() => {
      store.modelFor('user').inverseFor('job', store);
    }, /You defined the 'job' relationship on model:user, but you defined the inverse relationships of type model:job multiple times/);
  });

  test('Caches findInverseFor return value', function(assert) {
    assert.expect(1);
    let Job = store.modelFor('job');

    let inverseForUser = Job.inverseFor('user', store);
    Job.findInverseFor = function() {
      assert.ok(false, 'Find is not called anymore');
    };

    assert.equal(inverseForUser, Job.inverseFor('user', store), 'Inverse cached succesfully');
  });

  testInDebug('Errors out if you do not define an inverse for a reflexive relationship', function(
    assert
  ) {
    //Maybe store is evaluated lazily, so we need this :(
    assert.expectWarning(() => {
      store.push({
        data: {
          type: 'reflexive-model',
          id: '1',
        },
      });
      let reflexiveModel = store.peekRecord('reflexive-model', 1);
      reflexiveModel.get('reflexiveProp');
    }, /Detected a reflexive relationship by the name of 'reflexiveProp'/);
  });

  test('inverseFor is only called when inverse is not null', async function(assert) {
    assert.expect(2);
    let { owner } = this;
    owner.unregister('model:user');
    owner.unregister('model:job');

    class Post extends Model {
      @hasMany('comment', { async: false, inverse: null })
      comments;
    }
    class Comment extends Model {
      @belongsTo('post', { async: false, inverse: null })
      post;
    }
    class User extends Model {
      @hasMany('message', { async: false, inverse: 'user' })
      messages;
    }
    class Message extends Model {
      @belongsTo('user', { async: false, inverse: 'messages' })
      user;
    }
    owner.register('model:post', Post);
    owner.register('model:comment', Comment);
    owner.register('model:user', User);
    owner.register('model:message', Message);

    store.modelFor('post').inverseFor = function() {
      assert.notOk(true, 'Post model inverseFor is not called');
    };

    store.modelFor('comment').inverseFor = function() {
      assert.notOk(true, 'Comment model inverseFor is not called');
    };

    store.modelFor('message').inverseFor = function() {
      assert.ok(true, 'Message model inverseFor is called');
    };

    store.modelFor('user').inverseFor = function() {
      assert.ok(true, 'User model inverseFor is called');
    };

    store.push({
      data: {
        id: '1',
        type: 'post',
        relationships: {
          comments: {
            data: [
              {
                id: '1',
                type: 'comment',
              },
              {
                id: '2',
                type: 'comment',
              },
            ],
          },
        },
      },
    });
    store.push({
      data: [
        {
          id: '1',
          type: 'comment',
          relationships: {
            post: {
              data: {
                id: '1',
                type: 'post',
              },
            },
          },
        },
        {
          id: '2',
          type: 'comment',
          relationships: {
            post: {
              data: {
                id: '1',
                type: 'post',
              },
            },
          },
        },
      ],
    });
    store.push({
      data: {
        id: '1',
        type: 'user',
        relationships: {
          messages: {
            data: [
              {
                id: '1',
                type: 'message',
              },
              {
                id: '2',
                type: 'message',
              },
            ],
          },
        },
      },
    });
    store.push({
      data: [
        {
          id: '1',
          type: 'message',
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
        {
          id: '2',
          type: 'message',
          relationships: {
            post: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      ],
    });
  });

  testInDebug(
    "Inverse null relationships with models that don't exist throw a nice error if trying to use that relationship",
    async function(assert) {
      this.owner.unregister('model:user');
      class User extends Model {
        @belongsTo('post', { inverse: null })
        post;
      }
      this.owner.register('model:user', User);

      assert.expectAssertion(() => {
        store.createRecord('user', { post: null });
      }, /No model was found for/);

      // but don't error if the relationship is not used
      store.createRecord('user', {});
    }
  );

  test('Inverse relationships can be explicitly nullable', function(assert) {
    this.owner.unregister('model:user');
    class User extends Model {
      @hasMany('post', { inverse: 'participants', async: false })
      posts;
    }
    class Post extends Model {
      @belongsTo('user', { inverse: null, async: false })
      lastParticipant;
      @hasMany('user', { inverse: 'posts', async: false })
      participants;
    }
    this.owner.register('model:user', User);
    this.owner.register('model:post', Post);

    let user = store.createRecord('user');
    let post = store.createRecord('post');

    assert.equal(
      user.inverseFor('posts').name,
      'participants',
      'User.posts inverse is Post.participants'
    );
    assert.equal(post.inverseFor('lastParticipant'), null, 'Post.lastParticipant has no inverse');
    assert.equal(
      post.inverseFor('participants').name,
      'posts',
      'Post.participants inverse is User.posts'
    );
  });

  test('Null inverses are excluded from potential relationship resolutions', function(assert) {
    this.owner.unregister('model:user');
    class User extends Model {
      @hasMany('post', { async: false })
      posts;
    }
    class Post extends Model {
      @belongsTo('user', { inverse: null, async: false })
      lastParticipant;
      @hasMany('user', { async: false })
      participants;
    }
    this.owner.register('model:user', User);
    this.owner.register('model:post', Post);

    let user = store.createRecord('user');
    let post = store.createRecord('post');

    assert.equal(
      user.inverseFor('posts').name,
      'participants',
      'User.posts inverse is Post.participants'
    );
    assert.equal(post.inverseFor('lastParticipant'), null, 'Post.lastParticipant has no inverse');
    assert.equal(
      post.inverseFor('participants').name,
      'posts',
      'Post.participants inverse is User.posts'
    );
  });
});
