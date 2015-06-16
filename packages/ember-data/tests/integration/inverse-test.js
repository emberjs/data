var env, store, User, Job, ReflexiveModel;

var attr = DS.attr;
var belongsTo = DS.belongsTo;
var run = Ember.run;

function stringify(string) {
  return function() { return string; };
}

module('integration/inverse_test - inverseFor', {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      bestFriend: belongsTo('user', { async: true, inverse: null }),
      job: belongsTo('job', { async: false })
    });

    User.toString = stringify('user');

    Job = DS.Model.extend({
      isGood: attr(),
      user: belongsTo('user', { async: false })
    });

    Job.toString = stringify('job');

    ReflexiveModel = DS.Model.extend({
      reflexiveProp: belongsTo('reflexive-model', { async: false })
    });

    ReflexiveModel.toString = stringify('reflexiveModel');

    env = setupStore({
      user: User,
      job: Job,
      reflexiveModel: ReflexiveModel
    });

    store = env.store;

    Job = store.modelFor('job');
    User = store.modelFor('user');
    ReflexiveModel = store.modelFor('reflexive-model');
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("Finds the inverse when there is only one possible available", function () {
  //Maybe store is evaluated lazily, so we need this :(
  run(store, 'push', 'user', { id: 1 });

  deepEqual(Job.inverseFor('user', store), {
    type: User,
    name: 'job',
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');
});

test("Finds the inverse when only one side has defined it manually", function () {
  Job.reopen({
    owner: belongsTo('user', { inverse: 'previousJob', async: false })
  });

  User.reopen({
    previousJob: belongsTo('job', { async: false })
  });

  //Maybe store is evaluated lazily, so we need this :(
  var user, job;
  run(function() {
    user = store.push('user', { id: 1 });
    job = store.push('user', { id: 1 });
  });

  deepEqual(Job.inverseFor('owner', store), {
    type: User, //the model's type
    name: 'previousJob', //the models relationship key
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');

  deepEqual(User.inverseFor('previousJob', store), {
    type: Job, //the model's type
    name: 'owner', //the models relationship key
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');
});

test("Returns null if inverse relationship it is manually set with a different relationship key", function () {
  Job.reopen({
    user: belongsTo('user', { inverse: 'previousJob', async: false })
  });

  User.reopen({
    job: belongsTo('job', { async: false })
  });
  //Maybe store is evaluated lazily, so we need this :(
  var user;
  run(function() {
    user = store.push('user', { id: 1 });
  });

  equal(User.inverseFor('job', store), null, 'There is no inverse');
});

test("Errors out if you define 2 inverses to the same model", function () {
  Job.reopen({
    user: belongsTo('user', { inverse: 'job', async: false }),
    owner: belongsTo('user', { inverse: 'job', async: false })
  });

  User.reopen({
    job: belongsTo('job', { async: false })
  });

  //Maybe store is evaluated lazily, so we need this :(
  expectAssertion(function() {
    run(function() {
      store.push('user', { id: 1 });
    });
    User.inverseFor('job', store);
  }, "You defined the 'job' relationship on user, but you defined the inverse relationships of type job multiple times. Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses");
});


test("Caches findInverseFor return value", function () {
  expect(1);
  //Maybe store is evaluated lazily, so we need this :(
  run(function() {
    store.push('user', { id: 1 });
  });

  var inverseForUser = Job.inverseFor('user', store);
  Job.findInverseFor = function() {
    ok(false, 'Find is not called anymore');
  };

  equal(inverseForUser, Job.inverseFor('user', store), 'Inverse cached succesfully');
});

test("Errors out if you do not define an inverse for a reflexive relationship", function () {

  //Maybe store is evaluated lazily, so we need this :(
  warns(function() {
    var reflexiveModel;
    run(function() {
      reflexiveModel = store.push('reflexive-model', { id: 1 });
      reflexiveModel.get('reflexiveProp');
    });
  }, /Detected a reflexive relationship by the name of 'reflexiveProp'/);
});
