import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

import DS from 'ember-data';

let env, store, User, Manager, Job, Company, ReflexiveModel;

const { attr, belongsTo, hasMany } = DS;

function stringify(string) {
  return function() { return string; };
}

module('integration/inverse_test - inverseFor', {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      bestFriend: belongsTo('user', { async: true, inverse: null }),
      job: belongsTo('job', { async: false }),
      employer: belongsTo('company', {inverse:"employees"})
    });

    User.toString = stringify('user');

    Manager = User.extend({});
    Manager.toString = stringify('manager');

    Job = DS.Model.extend({
      isGood: attr(),
      user: belongsTo('user', { async: false })
    });

    Job.toString = stringify('job');

    Company = DS.Model.extend({
      employees: hasMany('user', {inverse: "employer", polymorphic: true})
    });
    Company.toString = stringify('company');

    ReflexiveModel = DS.Model.extend({
      reflexiveProp: belongsTo('reflexive-model', { async: false })
    });

    ReflexiveModel.toString = stringify('reflexiveModel');

    env = setupStore({
      user: User,
      manager: Manager,
      job: Job,
      company: Company,
      reflexiveModel: ReflexiveModel
    });

    store = env.store;

    Job = store.modelFor('job');
    User = store.modelFor('user');
    ReflexiveModel = store.modelFor('reflexive-model');
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("Finds the inverse when there is only one possible available", function(assert) {
  assert.deepEqual(Job.inverseFor('user', store), {
    type: User,
    name: 'job',
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');
});

test("Finds the inverse when only one side has defined it manually", function(assert) {
  Job.reopen({
    owner: belongsTo('user', { inverse: 'previousJob', async: false })
  });

  User.reopen({
    previousJob: belongsTo('job', { async: false })
  });

  assert.deepEqual(Job.inverseFor('owner', store), {
    type: User, //the model's type
    name: 'previousJob', //the models relationship key
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');

  assert.deepEqual(User.inverseFor('previousJob', store), {
    type: Job, //the model's type
    name: 'owner', //the models relationship key
    kind: 'belongsTo'
  }, 'Gets correct type, name and kind');
});

test("Returns null if inverse relationship it is manually set with a different relationship key", function(assert) {
  Job.reopen({
    user: belongsTo('user', { inverse: 'previousJob', async: false })
  });

  User.reopen({
    job: belongsTo('job', { async: false })
  });

  assert.equal(User.inverseFor('job', store), null, 'There is no inverse');
});

testInDebug("Errors out if you define 2 inverses to the same model", function(assert) {
  Job.reopen({
    user: belongsTo('user', { inverse: 'job', async: false }),
    owner: belongsTo('user', { inverse: 'job', async: false })
  });

  User.reopen({
    job: belongsTo('job', { async: false })
  });

  assert.expectAssertion(() => {
    User.inverseFor('job', store);
  }, /^You defined the 'job' relationship on user, but you defined the inverse relationships of type job multiple times/i);
});


test("Caches findInverseFor return value", function(assert) {
  assert.expect(1);

  var inverseForUser = Job.inverseFor('user', store);
  Job.findInverseFor = function() {
    assert.ok(false, 'Find is not called anymore');
  };

  assert.equal(inverseForUser, Job.inverseFor('user', store), 'Inverse cached succesfully');
});

test("polymorphic hasMany inverse is populated after push of base model", function(assert) {
  const done = assert.async();

  run(() => {
    store.push({
      data: {
        id: 'c1',
        type: 'company',
        relationships: {
          employees: {
            data: [
              {id: 'u1', type: 'user'}
            ]
          }
        }
      },
      included: [
        {
          id: 'u1',
          type: 'user',
          relationships: {}
        }
      ]
    });
  });

  const user = store.peekRecord('user', 'u1');

  user.get('employer').then(employer => {
    assert.ok(employer);
    done();
  });
});

test("polymorphic hasMany inverse is populated after push of descendant model", function(assert) {
  const done = assert.async();

  run(() => {
    store.push({
      data: {
        id: 'c1',
        type: 'company',
        relationships: {
          employees: {
            data: [
              {id: 'u1', type: 'manager'}
            ]
          }
        }
      },
      included: [
        {
          id: 'u1',
          type: 'manager',
          relationships: {}
        }
      ]
    });
  });

  const user = store.peekRecord('manager', 'u1');

  user.get('employer').then(employer => {
    assert.ok(employer);
    done();
  });
});

test("polymorphic hasMany contains both models after pushing two different types of model", function(assert) {
  const done = assert.async();

  run(() => {
    store.push({
      data: {
        id: 'c1',
        type: 'company',
        relationships: {
          employees: {
            data: [
            ]
          }
        }
      }
    });
    store.push({
      data: {
        id: 'u1',
        type: 'user',
        relationships: {
          employer: {
            data: { id: 'c1', type: 'company'}
          }
        }
      }
    });
    store.push({
      data: {
        id: 'm1',
        type: 'manager',
        relationships: {
          employer: {
            data: { id: 'c1', type: 'company'}
          }
        }
      }
    });
  });

  const company = store.peekRecord('company', 'c1');

  company.get('employees').then(employees => {
    assert.equal(employees.length, 2);
    done();
  });
});

testInDebug("Errors out if you do not define an inverse for a reflexive relationship", function(assert) {

  //Maybe store is evaluated lazily, so we need this :(
  assert.expectWarning(() => {
    var reflexiveModel;
    run(() => {
      store.push({
        data: {
          type: 'reflexive-model',
          id: '1'
        }
      });
      reflexiveModel = store.peekRecord('reflexive-model', 1);
      reflexiveModel.get('reflexiveProp');
    });
  }, /Detected a reflexive relationship by the name of 'reflexiveProp'/);
});
