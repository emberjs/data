var get = Ember.get;
var run = Ember.run;

module("unit/model/relationships - DS.belongsTo");

test("belongsTo lazily loads relationships as needed", function() {
  expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
    store.push('person', { id: 1, name: "Tom Dale", tag: 5 });
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

      equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
      equal(get(person, 'tag.name'), "friendly", "the tag shuld have name");

      strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
      asyncEqual(get(person, 'tag'), store.findRecord('tag', 5), "relationship object is the same as object retrieved directly");
    }));
  });
});

test("async belongsTo relationships work when the data hash has not been loaded", function() {
  expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Person) {
      equal(id, 1, "id should be 1");

      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tag: 2 });
    } else if (type === Tag) {
      equal(id, 2, "id should be 2");

      return Ember.RSVP.resolve({ id: 2, name: "friendly" });
    }
  };

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(get(person, 'name'), "Tom Dale", "The person is now populated");

      return run(function() {
        return get(person, 'tag');
      });
    })).then(async(function(tag) {
      equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
      equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
    }));
  });
});

test("async belongsTo relationships work when the data hash has already been loaded", function() {
  expect(3);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.push('tag', { id: 2, name: "friendly" });
    store.push('person', { id: 1, name: "Tom Dale", tag: 2 });
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(get(person, 'name'), "Tom Dale", "The person is now populated");
      return run(function() {
        return get(person, 'tag');
      });
    })).then(async(function(tag) {
      equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
      equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
    }));
  });
});

test("calling createRecord and passing in an undefined value for a relationship should be treated as if null", function () {
  expect(1);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.createRecord('person', { id: 1, tag: undefined });
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      strictEqual(person.get('tag'), null, "undefined values should return null relationships");
    }));
  });
});

test("When finding a hasMany relationship the inverse belongsTo relationship is available immediately", function() {
  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person });
  var store = env.store;

  env.adapter.findMany = function(store, type, ids, snapshots) {
    equal(snapshots[0].belongsTo('person').id, '1');
    return Ember.RSVP.resolve([{ id: 5, description: "fifth" }, { id: 2, description: "second" }]);
  };

  env.adapter.coalesceFindRequests = true;

  run(function() {
    store.push('person', { id: 1, name: "Tom Dale", occupations: [5, 2] });
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(get(person, 'isLoaded'), true, "isLoaded should be true");
      equal(get(person, 'name'), "Tom Dale", "the person is still Tom Dale");

      return get(person, 'occupations');
    })).then(async(function(occupations) {
      equal(get(occupations, 'length'), 2, "the list of occupations should have the correct length");

      equal(get(occupations.objectAt(0), 'description'), "fifth", "the occupation is the fifth");
      equal(get(occupations.objectAt(0), 'isLoaded'), true, "the occupation is now loaded");
    }));
  });
});

test("When finding a belongsTo relationship the inverse belongsTo relationship is available immediately", function() {
  expect(1);

  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupation: DS.belongsTo('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person });
  var store = env.store;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    equal(snapshot.belongsTo('person').id, '1');
    return Ember.RSVP.resolve({ id: 5, description: "fifth" });
  };

  run(function() {
    store.push('person', { id: 1, name: "Tom Dale", occupation: 5 });
  });

  run(function() {
    store.peekRecord('person', 1).get('occupation');
  });
});

test("belongsTo supports relationships to models with id 0", function() {
  expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.pushMany('tag', [{ id: 0, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
    store.push('person', { id: 1, name: "Tom Dale", tag: 0 });
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

      equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
      equal(get(person, 'tag.name'), "friendly", "the tag should have name");

      strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
      asyncEqual(get(person, 'tag'), store.findRecord('tag', 0), "relationship object is the same as object retrieved directly");
    }));
  });
});

test("belongsTo gives a warning when provided with a serialize option", function() {
  var Hobby = DS.Model.extend({
    name: DS.attr('string')
  });
  Hobby.toString = function() { return "Hobby"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    hobby: DS.belongsTo('hobby', { serialize: true, async: true })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ hobby: Hobby, person: Person });
  var store = env.store;

  run(function() {
    store.pushMany('hobby', [{ id: 1, name: "fishing" }, { id: 1, name: "coding" }]);
    store.push('person', { id: 1, name: "Tom Dale", hobby: 1 });
  });

  warns(function() {
    run(function() {
      store.find('person', 1).then(async(function(person) {
        get(person, 'hobby');
      }));
    });
  }, /You provided a serialize option on the "hobby" property in the "person" class, this belongs in the serializer. See DS.Serializer and it's implementations/);
});

test("belongsTo gives a warning when provided with an embedded option", function() {
  var Hobby = DS.Model.extend({
    name: DS.attr('string')
  });
  Hobby.toString = function() { return "Hobby"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    hobby: DS.belongsTo('hobby', { embedded: true, async: true })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ hobby: Hobby, person: Person });
  var store = env.store;

  run(function() {
    store.pushMany('hobby', [{ id: 1, name: "fishing" }, { id: 1, name: "coding" }]);
    store.push('person', { id: 1, name: "Tom Dale", hobby: 1 });
  });

  warns(function() {
    run(function() {
      store.find('person', 1).then(async(function(person) {
        get(person, 'hobby');
      }));
    });
  }, /You provided an embedded option on the "hobby" property in the "person" class, this belongs in the serializer. See DS.EmbeddedRecordsMixin/);
});

module("unit/model/relationships - DS.belongsTo async by default deprecations", {
  setup: function() {
    setupStore();
  }
});

test("setting DS.belongsTo without async false triggers deprecation", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  expectDeprecation(
    function() {
      run(function() {
        store.createRecord('person').get('tag');
      });
    },
    /In Ember Data 2.0, relationships will be asynchronous by default. You must set `tag: DS.belongsTo\('tag', { async: false }\)`/
  );
});
