var env, store, User, Job;
var run = Ember.run;

var attr = DS.attr;
var belongsTo = DS.belongsTo;

function stringify(string) {
  return function() { return string; };
}

module('integration/relationships/one_to_one_test - OneToOne relationships', {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      bestFriend: belongsTo('user', { async: true, inverse: 'bestFriend' }),
      job: belongsTo('job', { async: false })
    });
    User.toString = stringify('User');

    Job = DS.Model.extend({
      isGood: attr(),
      user: belongsTo('user', { async: false })
    });
    Job.toString = stringify('Job');

    env = setupStore({
      user: User,
      job: Job
    });

    store = env.store;
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test("Relationship is available from both sides even if only loaded from one side - async", function() {
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
      equal(fetchedUser, stanley, 'User relationship was set up correctly');
    });
  });
});


test("Relationship is available from both sides even if only loaded from one side - sync", function() {
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
  equal(job.get('user'), user, 'User relationship was set up correctly');
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - async", function() {
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
      equal(fetchedUser, null, 'User relationship was removed correctly');
    });
  });
});


test("Fetching a belongsTo that is set to null removes the record from a relationship - sync", function() {
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
  equal(job.get('user'), null, 'User relationship was removed correctly');
});


test("Fetching a belongsTo that is set to a different record, sets the old relationship to null - async", function() {
  expect(3);
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
      equal(fetchedUser, stanley, 'User relationship was initally setup correctly');
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
        equal(fetchedNewFriend, stanleysNewFriend, 'User relationship was updated correctly');
      });

      stanleysFriend.get('bestFriend').then(function(fetchedOldFriend) {
        equal(fetchedOldFriend, null, 'The old relationship was set to null correctly');
      });
    });
  });
});


test("Fetching a belongsTo that is set to a different record, sets the old relationship to null - sync", function() {
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
  equal(job.get('user'), user, 'Job and user initially setup correctly');
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

  equal(user.get('job'), newBetterJob, 'Job updated correctly');
  equal(job.get('user'), null, 'Old relationship nulled out correctly');
  equal(newBetterJob.get('user'), user, 'New job setup correctly');
});

/*
  Local edits
*/

test("Setting a OneToOne relationship reflects correctly on the other side- async", function() {
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
      equal(fetchedUser, stanley, 'User relationship was updated correctly');
    });
  });
});


test("Setting a OneToOne relationship reflects correctly on the other side- sync", function() {
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
  equal(job.get('user'), user, 'User relationship was set up correctly');
});


test("Setting a BelongsTo to a promise unwraps the promise before setting- async", function() {
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
      equal(fetchedUser, newFriend, 'User relationship was updated correctly');
    });
    newFriend.get('bestFriend').then(function(fetchedUser) {
      equal(fetchedUser, stanley, 'User relationship was updated correctly');
    });
  });
});


test("Setting a BelongsTo to a promise works when the promise returns null- async", function() {
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
      equal(fetchedUser, null, 'User relationship was updated correctly');
    });
  });
});


test("Setting a BelongsTo to a promise that didn't come from a relationship errors out", function () {
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

  expectAssertion(function() {
    run(function() {
      stanley.set('bestFriend', Ember.RSVP.resolve(igor));
    });
  }, /You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call./);
});

test("Setting a BelongsTo to a promise multiple times is resistant to race conditions- async", function () {
  expect(1);
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
      return Ember.RSVP.resolve({ id: 5, name: "Igor's friend" });
    } else if (id === '2') {
      stop();
      return new Ember.RSVP.Promise(function(resolve, reject) {
        setTimeout(function() {
          start();
          resolve({ id: 2, name: "Stanley's friend" });
        }, 1);
      });
    }
  };

  run(function() {
    newFriend.set('bestFriend', stanley.get('bestFriend'));
    newFriend.set('bestFriend', igor.get('bestFriend'));
    newFriend.get('bestFriend').then(function(fetchedUser) {
      equal(fetchedUser.get('name'), "Igor's friend", 'User relationship was updated correctly');
    });
  });
});

test("Setting a OneToOne relationship to null reflects correctly on the other side - async", function () {
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
      equal(fetchedUser, null, 'User relationship was removed correctly');
    });
  });
});

test("Setting a OneToOne relationship to null reflects correctly on the other side - sync", function () {
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
  equal(job.get('user'), null, 'User relationship was removed correctly');
});

test("Setting a belongsTo to a different record, sets the old relationship to null - async", function () {
  expect(3);

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
      equal(fetchedUser, stanley, 'User relationship was initally setup correctly');
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
        equal(fetchedNewFriend, stanleysNewFriend, 'User relationship was updated correctly');
      });

      stanleysFriend.get('bestFriend').then(function(fetchedOldFriend) {
        equal(fetchedOldFriend, null, 'The old relationship was set to null correctly');
      });
    });
  });
});

test("Setting a belongsTo to a different record, sets the old relationship to null - sync", function () {
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

  equal(job.get('user'), user, 'Job and user initially setup correctly');

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

  equal(user.get('job'), newBetterJob, 'Job updated correctly');
  equal(job.get('user'), null, 'Old relationship nulled out correctly');
  equal(newBetterJob.get('user'), user, 'New job setup correctly');
});

/*
Deleting tests
*/

test("When deleting a record that has a belongsTo relationship, the record is removed from the inverse but still has access to its own relationship - async", function () {
  // This observer is here to make sure that inverseRecord gets cleared, when
  // the record is deleted, before notifyRecordRelationshipRemoved() and in turn
  // notifyPropertyChange() gets called. If not properly cleared observers will
  // trigger with the old value of the relationship.
  User.reopen({
    bestFriendObserver: Ember.observer('bestFriend', function() {
      this.get('bestFriend');
    })
  });
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

  });
  run(function() {
    stanley.deleteRecord();
    stanleysFriend.get('bestFriend').then(function(fetchedUser) {
      equal(fetchedUser, null, 'Stanley got removed');
    });
    stanley.get('bestFriend').then(function(fetchedUser) {
      equal(fetchedUser, stanleysFriend, 'Stanleys friend did not get removed');
    });
  });
});

test("When deleting a record that has a belongsTo relationship, the record is removed from the inverse but still has access to its own relationship - sync", function () {
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
  });
  equal(user.get('job'), null, 'Job got removed from the user');
  equal(job.get('user'), user, 'Job still has the user');
});

/*
Rollback attributes tests
*/

test("Rollbacking attributes of deleted record restores the relationship on both sides - async", function () {
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
      equal(fetchedUser, stanley, 'Stanley got rollbacked correctly');
    });
    stanley.get('bestFriend').then(function(fetchedUser) {
      equal(fetchedUser, stanleysFriend, 'Stanleys friend did not get removed');
    });
  });
});

test("Rollbacking attributes of deleted record restores the relationship on both sides - sync", function () {
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
  equal(user.get('job'), job, 'Job got rollbacked correctly');
  equal(job.get('user'), user, 'Job still has the user');
});

test("Rollbacking attributes of created record removes the relationship on both sides - async", function () {
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
      equal(fetchedUser, null, 'Stanley got rollbacked correctly');
    });
    stanley.get('bestFriend').then(function(fetchedUser) {
      equal(fetchedUser, null, 'Stanleys friend did got removed');
    });
  });
});

test("Rollbacking attributes of created record removes the relationship on both sides - sync", function () {
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
  equal(user.get('job'), null, 'Job got rollbacked correctly');
  equal(job.get('user'), null, 'Job does not have user anymore');
});
