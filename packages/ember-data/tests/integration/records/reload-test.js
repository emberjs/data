var get = Ember.get;
var attr = DS.attr;
var Person, env;
var run = Ember.run;

module("integration/reload - Reloading Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });

    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  var count = 0;

  env.adapter.find = function(store, type, id, snapshot) {
    if (count === 0) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    } else if (count === 1) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Braaaahm Dale" });
    } else {
      ok(false, "Should not get here");
    }
  };

  run(function() {
    env.store.find('person', 1).then(function(person) {
      equal(get(person, 'name'), "Tom Dale", "The person is loaded with the right name");
      equal(get(person, 'isLoaded'), true, "The person is now loaded");
      var promise = person.reload();
      equal(get(person, 'isReloading'), true, "The person is now reloading");
      return promise;
    }).then(function(person) {
      equal(get(person, 'isReloading'), false, "The person is no longer reloading");
      equal(get(person, 'name'), "Braaaahm Dale", "The person is now updated with the right name");
    });
  });
});

test("When a record is reloaded and fails, it can try again", function() {
  var tom;
  run(function() {
    tom = env.store.push('person', { id: 1, name: "Tom Dale" });
  });

  var count = 0;
  env.adapter.find = function(store, type, id, snapshot) {
    equal(tom.get('isReloading'), true, "Tom is reloading");
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 1, name: "Thomas Dale" });
    }
  };

  run(function() {
    tom.reload().then(null, function() {
      equal(tom.get('isError'), true, "Tom is now errored");
      equal(tom.get('isReloading'), false, "Tom is no longer reloading");
      return tom.reload();
    }).then(function(person) {
      equal(person, tom, "The resolved value is the record");
      equal(tom.get('isError'), false, "Tom is no longer errored");
      equal(tom.get('isReloading'), false, "Tom is no longer reloading");
      equal(tom.get('name'), "Thomas Dale", "the updates apply");
    });
  });
});

test("When a record is loaded a second time, isLoaded stays true", function() {
  run(function() {
    env.store.push('person', { id: 1, name: "Tom Dale" });
  });

  run(function() {
    env.store.find('person', 1).then(function(person) {
      equal(get(person, 'isLoaded'), true, "The person is loaded");
      person.addObserver('isLoaded', isLoadedDidChange);

      // Reload the record
      env.store.push('person', { id: 1, name: "Tom Dale" });
      equal(get(person, 'isLoaded'), true, "The person is still loaded after load");

      person.removeObserver('isLoaded', isLoadedDidChange);
    });
  });

  function isLoadedDidChange() {
    // This shouldn't be hit
    equal(get(this, 'isLoaded'), true, "The person is still loaded after change");
  }
});

test("When a record is reloaded, its async hasMany relationships still work", function() {
  env.registry.register('model:person', DS.Model.extend({
    name: DS.attr(),
    tags: DS.hasMany('tag', { async: true })
  }));

  env.registry.register('model:tag', DS.Model.extend({
    name: DS.attr()
  }));

  var tags = { 1: "hipster", 2: "hair" };

  env.adapter.find = function(store, type, id, snapshot) {
    switch (type.modelName) {
      case 'person':
        return Ember.RSVP.resolve({ id: 1, name: "Tom", tags: [1, 2] });
      case 'tag':
        return Ember.RSVP.resolve({ id: id, name: tags[id] });
    }
  };

  var tom;

  run(function() {
    env.store.find('person', 1).then(function(person) {
      tom = person;
      equal(person.get('name'), "Tom", "precond");

      return person.get('tags');
    }).then(function(tags) {
      deepEqual(tags.mapBy('name'), ['hipster', 'hair']);

      return tom.reload();
    }).then(function(person) {
      equal(person.get('name'), "Tom", "precond");

      return person.get('tags');
    }).then(function(tags) {
      deepEqual(tags.mapBy('name'), ['hipster', 'hair'], "The tags are still there");
    });
  });
});

test("When a reload is issued while another reload is in flight, the data comes back and isReloading makes sense", function() {
  var resolve1, resolve2, tom;
  var count = 0;

  run(function() {
    tom = env.store.push('person', { id: 1, name: 'Tom Dale' });
  });

  env.adapter.find = function(store, type, id, snapshot) {
    count++;
    return new Ember.RSVP.Promise((resolve, reject) => {
      if (count === 1) {
        resolve1 = resolve;
      } else if (count === 2) {
        resolve2 = resolve;
      } else {
        ok(false, "Should not get here");
      }
    });
  };

  run(function() {
    var promise1 = tom.reload();
    equal(get(tom, 'isReloading'), true, 'Person is reloading after issuing first reload');

    promise1.then(function(person) {
      equal(get(person, 'name'), 'Tom Dale', 'First reload returns correct data');
      equal(get(person, 'isReloading'), true, 'Person is still reloading after first reload finishes, but second is still working');
      equal(person, tom, 'First reload updates the model accordingly');
    });
  });

  run(function() {
    var promise2 = tom.reload();
    equal(get(tom, 'isReloading'), true, 'Person is still reloading after issuing second reload');

    promise2.then(function(person) {
      equal(get(person, 'name'), 'Yehuda Katz', 'Second reload returns correct data');
      equal(get(person, 'isReloading'), false, 'Person is not reloading after second reload finishes');
      equal(person, tom, 'Second reload updates the model accordingly');
    });
  });

  run(function() {
    resolve1({ id: 1, name: 'Tom Dale' });
  });

  run(function() {
    resolve2({ id: 1, name: 'Yehuda Katz' });
  });
});

test('When two reloads are issued, the first does not resolve until the second is resolved', function() {
  var resolve1, resolve2, tom;
  var promise1resolved = false;
  var promise2resolved = false;
  var count = 0;

  run(function() {
    tom = env.store.push('person', { id: 1, name: 'Tom Dale' });
  });

  env.adapter.find = function(store, type, id, snapshot) {
    count++;
    return new Ember.RSVP.Promise((resolve, reject) => {
      if (count === 1) {
        resolve1 = resolve;
      } else if (count === 2) {
        resolve2 = resolve;
      } else {
        ok(false, "Should not get here");
      }
    });
  };

  run(function() {
    tom.reload().then(function() {
      promise1resolved = true;
    });
    tom.reload().then(function() {
      promise2resolved = true;
    });
  });

  run(function() {
    resolve1({ id: 1, name: 'Tom Dale' });
  });

  run(function() {
    equal(promise1resolved, false, 'The first promise should not be resolved while the second is still in flight');
    resolve2({ id: 1, name: 'Yehuda Katz' });
  });

  run(function() {
    equal(promise1resolved, true, 'The first promise should be resolved when the second is finished');
    equal(promise2resolved, true, 'The second promise should be resolved');
  });
});
