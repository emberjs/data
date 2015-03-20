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
      job: belongsTo('job')
    });

    User.toString = stringify('user');

    Job = DS.Model.extend({
      isGood: attr(),
      user: belongsTo('user')
    });

    Job.toString = stringify('job');

    ReflexiveModel = DS.Model.extend({
      reflexiveProp: belongsTo('reflexiveModel')
    });

    ReflexiveModel.toString = stringify('reflexiveModel');

    env = setupStore({
      user: User,
      job: Job,
      reflexiveModel: ReflexiveModel
    });

    store = env.store;

    User = store.modelFor('user');
    Job = store.modelFor('job');
    ReflexiveModel = store.modelFor('reflexiveModel');
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("Finds the inverse when there is only one possible available", function () {
  //Maybe store is evaluated lazily, so we need this :(
  run(store, 'push', 'user', { id: 1 });

  deepEqual(Job.inverseFor('user'), {
    type: User,
    name: 'job',
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');
});

test("Finds the inverse when only one side has defined it manually", function () {
  Job.reopen({
    owner: belongsTo('user', { inverse: 'previousJob' })
  });

  User.reopen({
    previousJob: belongsTo('job')
  });

  //Maybe store is evaluated lazily, so we need this :(
  var user, job;
  run(function() {
    user = store.push('user', { id: 1 });
    job = store.push('user', { id: 1 });
  });

  deepEqual(Job.inverseFor('owner'), {
    type: User, //the model's type
    name: 'previousJob', //the models relationship key
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');

  deepEqual(User.inverseFor('previousJob'), {
    type: Job, //the model's type
    name: 'owner', //the models relationship key
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');
});

test("Returns null if inverse relationship it is manually set with a different relationship key", function () {
  Job.reopen({
    user: belongsTo('user', { inverse: 'previousJob' })
  });

  User.reopen({
    job: belongsTo('job')
  });
  //Maybe store is evaluated lazily, so we need this :(
  var user;
  run(function() {
    user = store.push('user', { id: 1 });
  });

  equal(User.inverseFor('job'), null, 'There is no inverse');
});

test("Errors out if you define 2 inverses to the same model", function () {
  Job.reopen({
    user: belongsTo('user', { inverse: 'job' }),
    owner: belongsTo('user', { inverse: 'job' })
  });

  User.reopen({
    job: belongsTo('job')
  });

  //Maybe store is evaluated lazily, so we need this :(
  expectAssertion(function() {
    run(function() {
      store.push('user', { id: 1 });
    });
    User.inverseFor('job');
  }, "You defined the 'job' relationship on user, but you defined the inverse relationships of type job multiple times. Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses");
});


test("Caches findInverseFor return value", function () {
  expect(1);
  //Maybe store is evaluated lazily, so we need this :(
  run(function() {
    store.push('user', { id: 1 });
  });

  var inverseForUser = Job.inverseFor('user');
  Job.findInverseFor = function() {
    ok(false, 'Find is not called anymore');
  };

  equal(inverseForUser, Job.inverseFor('user'), 'Inverse cached succesfully');
});

test("Errors out if you do not define an inverse for a reflexive relationship", function () {

  //Maybe store is evaluated lazily, so we need this :(
  warns(function() {
    var reflexiveModel;
    run(function() {
      reflexiveModel = store.push('reflexiveModel', { id: 1 });
    });
  }, /Detected a reflexive relationship by the name of 'reflexiveProp'/);
});
