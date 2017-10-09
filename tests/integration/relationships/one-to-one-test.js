import { resolve, Promise as EmberPromise } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

import DS from 'ember-data';

var env, store, User, Job;

var attr = DS.attr;
var belongsTo = DS.belongsTo;

module('integration/relationships/one_to_one_test - OneToOne relationships', {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      bestFriend: belongsTo('user', { async: true, inverse: 'bestFriend' }),
      job: belongsTo('job', { async: false })
    });

    Job = DS.Model.extend({
      isGood: attr(),
      user: belongsTo('user', { async: false })
    });

    env = setupStore({
      user: User,
      job: Job,
      adapter: DS.Adapter.extend({
        deleteRecord: () => resolve()
      })
    });

    store = env.store;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test("Relationship is available from both sides even if only loaded from one side - async", function(assert) {
  var stanley, stanleysFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        }
      }
    });

    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, stanley, 'User relationship was set up correctly');
    });
  });
});


test("Relationship is available from both sides even if only loaded from one side - sync", function(assert) {
  var job, user;
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: true
        }
      }
    });
    user = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          job: {
            data: {
              id: 2,
              type: 'job'
            }
          }
        }
      }
    });
  });
  assert.equal(job.get('user'), user, 'User relationship was set up correctly');
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - async", function(assert) {
  var stanleysFriend;
  run(function() {
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        },
        relationships: {
          bestFriend: {
            data: {
              id: 1,
              type: 'user'
            }
          }
        }
      }
    });
    store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: null
          }
        }
      }
    });
    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'User relationship was removed correctly');
    });
  });
});


test("Fetching a belongsTo that is set to null removes the record from a relationship - sync", function(assert) {
  var job;
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: true
        }
      }
    });
    store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          job: {
            data: {
              id: 2,
              type: 'job'
            }
          }
        }
      }
    });
  });
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: true
        },
        relationships: {
          user: {
            data: null
          }
        }
      }
    });
  });
  assert.equal(job.get('user'), null, 'User relationship was removed correctly');
});


test("Fetching a belongsTo that is set to a different record, sets the old relationship to null - async", function(assert) {
  assert.expect(3);
  var stanley, stanleysFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        },
        relationships: {
          bestFriend: {
            data: {
              id: 1,
              type: 'user'
            }
          }
        }
      }
    });

    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, stanley, 'User relationship was initally setup correctly');
      var stanleysNewFriend;
      run(function() {
        stanleysNewFriend = store.push({
          data: {
            id: 3,
            type: 'user',
            attributes: {
              name: "Stanley's New friend"
            },
            relationships: {
              bestFriend: {
                data: {
                  id: 1,
                  type: 'user'
                }
              }
            }
          }
        });
      });

      stanley.get('bestFriend').then(function(fetchedNewFriend) {
        assert.equal(fetchedNewFriend, stanleysNewFriend, 'User relationship was updated correctly');
      });

      stanleysFriend.get('bestFriend').then(function(fetchedOldFriend) {
        assert.equal(fetchedOldFriend, null, 'The old relationship was set to null correctly');
      });
    });
  });
});


test("Fetching a belongsTo that is set to a different record, sets the old relationship to null - sync", function(assert) {
  var job, user, newBetterJob;
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: false
        }
      }
    });
    user = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          job: {
            data: {
              id: 2,
              type: 'job'
            }
          }
        }
      }
    });
  });
  assert.equal(job.get('user'), user, 'Job and user initially setup correctly');
  run(function() {
    newBetterJob = store.push({
      data: {
        id: 3,
        type: 'job',
        attributes: {
          isGood: true
        },
        relationships: {
          user: {
            data: {
              id: 1,
              type: 'user'
            }
          }
        }
      }
    });
  });

  assert.equal(user.get('job'), newBetterJob, 'Job updated correctly');
  assert.equal(job.get('user'), null, 'Old relationship nulled out correctly');
  assert.equal(newBetterJob.get('user'), user, 'New job setup correctly');
});

/*
  Local edits
*/

test("Setting a OneToOne relationship reflects correctly on the other side- async", function(assert) {
  var stanley, stanleysFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        }
      }
    });
  });
  run(function() {
    stanley.set('bestFriend', stanleysFriend);
    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, stanley, 'User relationship was updated correctly');
    });
  });
});


test("Setting a OneToOne relationship reflects correctly on the other side- sync", function(assert) {
  var job, user;
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: true
        }
      }
    });
    user = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
  });
  run(function() {
    user.set('job', job);
  });
  assert.equal(job.get('user'), user, 'User relationship was set up correctly');
});


test("Setting a BelongsTo to a promise unwraps the promise before setting- async", function(assert) {
  var stanley, stanleysFriend, newFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        }
      }
    });
    newFriend = store.push({
      data: {
        id: 3,
        type: 'user',
        attributes: {
          name: "New friend"
        }
      }
    });
  });
  run(function() {
    newFriend.set('bestFriend', stanleysFriend.get('bestFriend'));
    stanley.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, newFriend, 'User relationship was updated correctly');
    });
    newFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, stanley, 'User relationship was updated correctly');
    });
  });
});


test("Setting a BelongsTo to a promise works when the promise returns null- async", function(assert) {
  var igor, newFriend;
  run(function() {
    store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    igor = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Igor"
        }
      }
    });
    newFriend = store.push({
      data: {
        id: 3,
        type: 'user',
        attributes: {
          name: "New friend"
        },
        relationships: {
          bestFriend: {
            data: {
              id: 1,
              type: 'user'
            }
          }
        }
      }
    });
  });
  run(function() {
    newFriend.set('bestFriend', igor.get('bestFriend'));
    newFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'User relationship was updated correctly');
    });
  });
});


testInDebug("Setting a BelongsTo to a promise that didn't come from a relationship errors out", function(assert) {
  var stanley, igor;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    igor = store.push({
      data: {
        id: 3,
        type: 'user',
        attributes: {
          name: 'Igor'
        }
      }
    });
  });

  assert.expectAssertion(function() {
    run(function() {
      stanley.set('bestFriend', resolve(igor));
    });
  }, /You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call./);
});

test("Setting a BelongsTo to a promise multiple times is resistant to race conditions- async", function(assert) {
  assert.expect(1);
  var stanley, igor, newFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    igor = store.push({
      data: {
        id: 3,
        type: 'user',
        attributes: {
          name: "Igor"
        },
        relationships: {
          bestFriend: {
            data: {
              id: 5,
              type: 'user'
            }
          }
        }
      }
    });
    newFriend = store.push({
      data: {
        id: 7,
        type: 'user',
        attributes: {
          name: "New friend"
        }
      }
    });
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (id === '5') {
      return resolve({ data: { id: 5, type: 'user', attributes: { name: "Igor's friend" } } });
    } else if (id === '2') {
      let done = assert.async();
      return new EmberPromise(function(resolve, reject) {
        setTimeout(function() {
          done();
          resolve({ data: { id: 2, type: 'user', attributes: { name: "Stanley's friend" } } });
        }, 1);
      });
    }
  };

  run(function() {
    newFriend.set('bestFriend', stanley.get('bestFriend'));
    newFriend.set('bestFriend', igor.get('bestFriend'));
    newFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser.get('name'), "Igor's friend", 'User relationship was updated correctly');
    });
  });
});

test("Setting a OneToOne relationship to null reflects correctly on the other side - async", function(assert) {
  var stanley, stanleysFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        },
        relationships: {
          bestFriend: {
            data: {
              id: 1,
              type: 'user'
            }
          }
        }
      }
    });
  });

  run(function() {
    stanley.set('bestFriend', null); // :(
    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'User relationship was removed correctly');
    });
  });
});

test("Setting a OneToOne relationship to null reflects correctly on the other side - sync", function(assert) {
  var job, user;
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: false
        },
        relationships: {
          user: {
            data: {
              id: 1,
              type: 'user'
            }
          }
        }
      }
    });
    user = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          job: {
            data: {
              id: 2,
              type: 'job'
            }
          }
        }
      }
    });
  });

  run(function() {
    user.set('job', null);
  });
  assert.equal(job.get('user'), null, 'User relationship was removed correctly');
});

test("Setting a belongsTo to a different record, sets the old relationship to null - async", function(assert) {
  assert.expect(3);

  var stanley, stanleysFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        },
        relationships: {
          bestFriend: {
            data: {
              id: 1,
              type: 'user'
            }
          }
        }
      }
    });


    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, stanley, 'User relationship was initally setup correctly');
      var stanleysNewFriend = store.push({
        data: {
          id: 3,
          type: 'user',
          attributes: {
            name: "Stanley's New friend"
          }
        }
      });

      run(function() {
        stanleysNewFriend.set('bestFriend', stanley);
      });

      stanley.get('bestFriend').then(function(fetchedNewFriend) {
        assert.equal(fetchedNewFriend, stanleysNewFriend, 'User relationship was updated correctly');
      });

      stanleysFriend.get('bestFriend').then(function(fetchedOldFriend) {
        assert.equal(fetchedOldFriend, null, 'The old relationship was set to null correctly');
      });
    });
  });
});

test("Setting a belongsTo to a different record, sets the old relationship to null - sync", function(assert) {
  var job, user, newBetterJob;
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: false
        }
      }
    });
    user = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          job: {
            data: {
              id: 2,
              type: 'job'
            }
          }
        }
      }
    });
  });

  assert.equal(job.get('user'), user, 'Job and user initially setup correctly');

  run(function() {
    newBetterJob = store.push({
      data: {
        id: 3,
        type: 'job',
        attributes: {
          isGood: true
        }
      }
    });

    newBetterJob.set('user', user);
  });

  assert.equal(user.get('job'), newBetterJob, 'Job updated correctly');
  assert.equal(job.get('user'), null, 'Old relationship nulled out correctly');
  assert.equal(newBetterJob.get('user'), user, 'New job setup correctly');
});

/*
Rollback attributes tests
*/

test("Rollbacking attributes of deleted record restores the relationship on both sides - async", function(assert) {
  var stanley, stanleysFriend;
  run(function() {
    stanley = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          bestFriend: {
            data: {
              id: 2,
              type: 'user'
            }
          }
        }
      }
    });
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        }
      }
    });

  });
  run(function() {
    stanley.deleteRecord();
  });
  run(function() {
    stanley.rollbackAttributes();
    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, stanley, 'Stanley got rollbacked correctly');
    });
    stanley.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, stanleysFriend, 'Stanleys friend did not get removed');
    });
  });
});

test("Rollbacking attributes of deleted record restores the relationship on both sides - sync", function(assert) {
  var job, user;
  run(function() {
    job = store.push({
      data: {
        id: 2,
        type: 'job',
        attributes: {
          isGood: true
        }
      }
    });
    user = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          job: {
            data: {
              id: 2,
              type: 'job'
            }
          }
        }
      }
    });
  });
  run(function() {
    job.deleteRecord();
    job.rollbackAttributes();
  });
  assert.equal(user.get('job'), job, 'Job got rollbacked correctly');
  assert.equal(job.get('user'), user, 'Job still has the user');
});

test("Rollbacking attributes of created record removes the relationship on both sides - async", function(assert) {
  var stanleysFriend, stanley;
  run(function() {
    stanleysFriend = store.push({
      data: {
        id: 2,
        type: 'user',
        attributes: {
          name: "Stanley's friend"
        }
      }
    });

    stanley = store.createRecord('user', { bestFriend: stanleysFriend });
  });
  run(function() {
    stanley.rollbackAttributes();
    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'Stanley got rollbacked correctly');
    });
    stanley.get('bestFriend').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'Stanleys friend did got removed');
    });
  });
});

test("Rollbacking attributes of created record removes the relationship on both sides - sync", function(assert) {
  var user, job;
  run(function() {
    user = store.push({
      data: {
        id: 1,
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });

    job = store.createRecord('job', { user: user });
  });
  run(function() {
    job.rollbackAttributes();
  });
  assert.equal(user.get('job'), null, 'Job got rollbacked correctly');
  assert.equal(job.get('user'), null, 'Job does not have user anymore');
});
