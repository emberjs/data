import DS from 'ember-data';
import Ember from 'ember';
import setupStore from 'dummy/tests/helpers/store';
import { isEnabled } from 'ember-data/-private';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

var get = Ember.get;
var run = Ember.run;
var env, Person;

module("integration/references/has-many", {
  beforeEach() {
    var Family = DS.Model.extend({
      persons: DS.hasMany({ async: true })
    });
    Person = DS.Model.extend({
      name: DS.attr(),
      family: DS.belongsTo()
    });
    env = setupStore({
      person: Person,
      family: Family
    });
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

testInDebug("record#hasMany asserts when specified relationship doesn't exist", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1
      }
    });
  });

  assert.expectAssertion(function() {
    run(function() {
      family.hasMany("unknown-relationship");
    });
  }, "There is no hasMany relationship named 'unknown-relationship' on a model of modelClass 'family'");
});

testInDebug("record#hasMany asserts when the type of the specified relationship isn't the requested one", function(assert) {
  var person;
  run(function() {
    person = env.store.push({
      data: {
        type: 'person',
        id: 1
      }
    });
  });

  assert.expectAssertion(function() {
    run(function() {
      person.hasMany("family");
    });
  }, "You tried to get the 'family' relationship on a 'person' via record.hasMany('family'), but the relationship is of kind 'belongsTo'. Use record.belongsTo('family') instead.");
});

test("record#hasMany", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');

  assert.equal(personsReference.remoteType(), 'ids');
  assert.equal(personsReference.type, 'person');
  assert.deepEqual(personsReference.ids(), ['1', '2']);
});

test("record#hasMany for linked references", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            links: { related: '/families/1/persons' }
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');

  assert.equal(personsReference.remoteType(), 'link');
  assert.equal(personsReference.type, 'person');
  assert.equal(personsReference.link(), '/families/1/persons');
});

test("HasManyReference#parent is a reference to the parent where the relationship is defined", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
  });

  var familyReference = env.store.getReference('family', 1);
  var personsReference = family.hasMany('persons');

  assert.ok(familyReference);
  assert.equal(personsReference.parent, familyReference);
});

test("HasManyReference#meta() returns the most recent meta for the relationship", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            links: { related: '/families/1/persons' },
            meta: {
              foo: true
            }
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');
  assert.deepEqual(personsReference.meta(), { foo: true });
});

testInDebug("push(array)", function(assert) {
  var done = assert.async();

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');

  if (isEnabled('ds-overhaul-references')) {
    assert.expectDeprecation("HasManyReference#push(array) is deprecated. Push a JSON-API document instead.");
  }

  run(function() {
    var data = [
      { data: { type: 'person', id: 1, attributes: { name: "Vito" } } },
      { data: { type: 'person', id: 2, attributes: { name: "Michael" } } }
    ];

    personsReference.push(data).then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 2);
      assert.equal(records.objectAt(0).get('name'), "Vito");
      assert.equal(records.objectAt(1).get('name'), "Michael");

      done();
    });
  });
});

testInDebug("push(array) works with polymorphic type", function(assert) {
  var done = assert.async();

  env.registry.register('model:mafia-boss', Person.extend());

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1
      }
    });
  });

  var personsReference = family.hasMany('persons');

  run(() => {
    var data = [
      { data: { type: 'mafia-boss', id: 1, attributes: { name: "Vito" } } }
    ];

    if (isEnabled('ds-overhaul-references')) {
      assert.expectDeprecation("HasManyReference#push(array) is deprecated. Push a JSON-API document instead.");
    } else {
      assert.expectNoDeprecation();
    }

    personsReference.push(data).then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 1);
      assert.equal(records.objectAt(0).get('name'), "Vito");

      done();
    });
  });
});

testInDebug("push(array) asserts polymorphic type", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1
      }
    });
  });

  var personsReference = family.hasMany('persons');

  if (isEnabled('ds-overhaul-references')) {
    assert.expectDeprecation("HasManyReference#push(array) is deprecated. Push a JSON-API document instead.");
  } else {
    assert.expectNoDeprecation();
  }

  assert.expectAssertion(() => {
    run(() => {
      var data = [
        { data: { type: 'family', id: 1 } }
      ];

      personsReference.push(data);
    });
  }, "You cannot add a record of modelClass 'family' to the 'family.persons' relationship (only 'person' allowed)");
});

testInDebug("push(object) supports legacy, non-JSON-API-conform payload", function(assert) {
  var done = assert.async();

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');

  run(function() {
    var payload = {
      data: [
        { data: { type: 'person', id: 1, attributes: { name: "Vito" } } },
        { data: { type: 'person', id: 2, attributes: { name: "Michael" } } }
      ]
    };

    if (isEnabled('ds-overhaul-references')) {
      assert.expectDeprecation("HasManyReference#push() expects a valid JSON-API document.");
    } else {
      assert.expectNoDeprecation();
    }

    personsReference.push(payload).then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 2);
      assert.equal(records.objectAt(0).get('name'), "Vito");
      assert.equal(records.objectAt(1).get('name'), "Michael");

      done();
    });
  });
});

if (isEnabled('ds-overhaul-references')) {
  test("push(object) supports JSON-API payload", function(assert) {
    var done = assert.async();

    var family;
    run(function() {
      family = env.store.push({
        data: {
          type: 'family',
          id: 1,
          relationships: {
            persons: {
              data: [
                { type: 'person', id: 1 },
                { type: 'person', id: 2 }
              ]
            }
          }
        }
      });
    });

    var personsReference = family.hasMany('persons');

    run(function() {
      var payload = {
        data: [
          { type: 'person', id: 1, attributes: { name: "Vito" } },
          { type: 'person', id: 2, attributes: { name: "Michael" } }
        ]
      };

      personsReference.push(payload).then(function(records) {
        assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
        assert.equal(get(records, 'length'), 2);
        assert.equal(records.objectAt(0).get('name'), "Vito");
        assert.equal(records.objectAt(1).get('name'), "Michael");

        done();
      });
    });
  });

  test("push(object) works with polymorphic type", function(assert) {
    var done = assert.async();

    env.registry.register('model:mafia-boss', Person.extend());

    var family;
    run(function() {
      family = env.store.push({
        data: {
          type: 'family',
          id: 1
        }
      });
    });

    var personsReference = family.hasMany('persons');

    run(() => {
      var payload = {
        data: [
          { type: 'mafia-boss', id: 1, attributes: { name: "Vito" } }
        ]
      };

      personsReference.push(payload).then(function(records) {
        assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
        assert.equal(get(records, 'length'), 1);
        assert.equal(records.objectAt(0).get('name'), "Vito");

        done();
      });
    });
  });

  test("push(object) asserts polymorphic type", function(assert) {
    var family;
    run(function() {
      family = env.store.push({
        data: {
          type: 'family',
          id: 1
        }
      });
    });

    var personsReference = family.hasMany('persons');

    assert.expectAssertion(() => {
      run(() => {
        var payload = {
          data: [
            { type: 'family', id: 1 }
          ]
        };

        personsReference.push(payload);
      });
    }, "You cannot add a record of modelClass 'family' to the 'family.persons' relationship (only 'person' allowed)");
  });
}

test("push(promise)", function(assert) {
  var done = assert.async();

  var push;
  var deferred = Ember.RSVP.defer();

  run(function() {
    var family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
    var personsReference = family.hasMany('persons');
    push = personsReference.push(deferred.promise);
  });

  assert.ok(push.then, 'HasManyReference.push returns a promise');

  run(function() {
    var payload = {
      data: [
        { data: { type: 'person', id: 1, attributes: { name: "Vito" } } },
        { data: { type: 'person', id: 2, attributes: { name: "Michael" } } }
      ]
    };

    if (isEnabled('ds-overhaul-references')) {
      payload = {
        data: [
          { type: 'person', id: 1, attributes: { name: "Vito" } },
          { type: 'person', id: 2, attributes: { name: "Michael" } }
        ]
      };
    }

    deferred.resolve(payload);
  });

  run(function() {
    push.then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 2);
      assert.equal(records.objectAt(0).get('name'), "Vito");
      assert.equal(records.objectAt(1).get('name'), "Michael");

      done();
    });
  });
});

test("value() returns null when reference is not yet loaded", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');
  assert.strictEqual(personsReference.value(), null);
});

test("value() returns the referenced records when all records are loaded", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
    env.store.push({ data: { type: 'person', id: 1, attributes: { name: "Vito" } } });
    env.store.push({ data: { type: 'person', id: 2, attributes: { name: "Michael" } } });
  });

  run(function() {
    var personsReference = family.hasMany('persons');
    var records = personsReference.value();
    assert.equal(get(records, 'length'), 2);
    assert.equal(records.isEvery('isLoaded'), true);
  });
});

test("value() returns an empty array when the reference is loaded and empty", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: []
          }
        }
      }
    });
  });

  run(function() {
    var personsReference = family.hasMany('persons');
    var records = personsReference.value();
    assert.equal(get(records, 'length'), 0);
  });
});

test("_isLoaded() returns an true array when the reference is loaded and empty", function(assert) {
  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: []
          }
        }
      }
    });
  });

  run(function() {
    var personsReference = family.hasMany('persons');
    var isLoaded = personsReference._isLoaded();
    assert.equal(isLoaded, true);
  });
});

test("load() fetches the referenced records", function(assert) {
  var done = assert.async();

  env.adapter.findMany = function(store, type, id) {
    return Ember.RSVP.resolve({ data: [{ id: 1, type: 'person', attributes: { name: "Vito" } }, { id: 2, type: 'person', attributes: { name: "Michael" } }] });
  };

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');

  run(function() {
    personsReference.load().then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 2);
      assert.equal(records.objectAt(0).get('name'), "Vito");
      assert.equal(records.objectAt(1).get('name'), "Michael");

      done();
    });
  });
});

test("load() fetches link when remoteType is link", function(assert) {
  var done = assert.async();

  env.adapter.findHasMany = function(store, snapshot, link) {
    assert.equal(link, "/families/1/persons");

    return Ember.RSVP.resolve({ data: [{ id: 1, type: 'person', attributes: { name: "Vito" } }, { id: 2, type: 'person', attributes: { name: "Michael" } }] });
  };

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            links: { related: '/families/1/persons' }
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');
  assert.equal(personsReference.remoteType(), "link");

  run(function() {
    personsReference.load().then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 2);
      assert.equal(records.objectAt(0).get('name'), "Vito");
      assert.equal(records.objectAt(1).get('name'), "Michael");

      done();
    });
  });
});

test("load() fetches link when remoteType is link but an empty set of records is returned", function(assert) {
  env.adapter.findHasMany = function(store, snapshot, link) {
    assert.equal(link, "/families/1/persons");

    return Ember.RSVP.resolve({ data: [] });
  };

  let family;
  run(() => {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            links: { related: '/families/1/persons' }
          }
        }
      }
    });
  });

  let personsReference = family.hasMany('persons');
  assert.equal(personsReference.remoteType(), "link");

  return run(() => {
    return personsReference.load().then((records) => {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 0);
      assert.equal(get(personsReference.value(), 'length'), 0);
    });
  });
});

test("load() - only a single find is triggered", function(assert) {
  var done = assert.async();

  var deferred = Ember.RSVP.defer();
  var count = 0;

  env.adapter.findMany = function(store, type, id) {
    count++;
    assert.equal(count, 1);

    return deferred.promise;
  };

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');

  run(function() {
    personsReference.load();
    personsReference.load().then(function(records) {
      assert.equal(get(records, 'length'), 2);
    });
  });

  run(function() {
    deferred.resolve({ data: [{ id: 1, type: 'person', attributes: { name: "Vito" } }, { id: 2, type: 'person', attributes: { name: "Michael" } }] });
  });

  run(function() {
    personsReference.load().then(function(records) {
      assert.equal(get(records, 'length'), 2);

      done();
    });
  });
});

test("reload()", function(assert) {
  var done = assert.async();

  env.adapter.findMany = function(store, type, id) {
    return Ember.RSVP.resolve({ data: [{ id: 1, type: 'person', attributes: { name: "Vito Coreleone" } }, { id: 2, type: 'person', attributes: { name: "Michael Coreleone" } }] });
  };

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            data: [
              { type: 'person', id: 1 },
              { type: 'person', id: 2 }
            ]
          }
        }
      }
    });
    env.store.push({ data: { type: 'person', id: 1, attributes: { name: "Vito" } } });
    env.store.push({ data: { type: 'person', id: 2, attributes: { name: "Michael" } } });
  });

  var personsReference = family.hasMany('persons');

  run(function() {
    personsReference.reload().then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 2);
      assert.equal(records.objectAt(0).get('name'), "Vito Coreleone");
      assert.equal(records.objectAt(1).get('name'), "Michael Coreleone");

      done();
    });
  });
});

test("reload() fetches link when remoteType is link", function(assert) {
  var done = assert.async();

  var count = 0;
  env.adapter.findHasMany = function(store, snapshot, link) {
    count++;
    assert.equal(link, "/families/1/persons");

    if (count === 1) {
      return Ember.RSVP.resolve({ data: [{ id: 1, type: 'person', attributes: { name: "Vito" } }, { id: 2, type: 'person', attributes: { name: "Michael" } }] });
    } else {
      return Ember.RSVP.resolve({ data: [{ id: 1, type: 'person', attributes: { name: "Vito Coreleone" } }, { id: 2, type: 'person', attributes: { name: "Michael Coreleone" } }] });
    }
  };

  var family;
  run(function() {
    family = env.store.push({
      data: {
        type: 'family',
        id: 1,
        relationships: {
          persons: {
            links: { related: '/families/1/persons' }
          }
        }
      }
    });
  });

  var personsReference = family.hasMany('persons');
  assert.equal(personsReference.remoteType(), "link");

  run(function() {
    personsReference.load().then(function() {
      return personsReference.reload();
    }).then(function(records) {
      assert.ok(records instanceof DS.ManyArray, "push resolves with the referenced records");
      assert.equal(get(records, 'length'), 2);
      assert.equal(records.objectAt(0).get('name'), "Vito Coreleone");
      assert.equal(records.objectAt(1).get('name'), "Michael Coreleone");

      done();
    });
  });
});
