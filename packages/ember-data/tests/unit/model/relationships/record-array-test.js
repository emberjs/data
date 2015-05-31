var get = Ember.get;
var set = Ember.set;
var run = Ember.run;

module("unit/model/relationships - RecordArray");

test("updating the content of a RecordArray updates its content", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({ tag: Tag });
  var store = env.store;
  var records, tags, ghosts;

  run(function() {
    records = store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
    ghosts = Ember.A(records).mapBy('_ghost');
    tags = DS.RecordArray.create({ content: Ember.A(ghosts.slice(0, 2)), store: store, type: Tag });
  });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  run(function() {
    set(tags, 'content', Ember.A(ghosts.slice(1, 3)));
  });

  tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

test("can create child record from a hasMany relationship", function() {
  expect(3);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.push('person', { id: 1, name: "Tom Dale" });
  });

  run(function() {
    store.find('person', 1).then(async(function(person) {
      person.get("tags").createRecord({ name: "cool" });

      equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
      equal(get(person, 'tags.length'), 1, "tag is added to the parent record");
      equal(get(person, 'tags').objectAt(0).get("name"), "cool", "tag values are passed along");
    }));
  });
});

