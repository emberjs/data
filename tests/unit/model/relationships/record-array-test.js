import DS from 'ember-data';

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
  var records, tags, internalModel;

  run(function() {
    store.push({
      data: [{
        type: 'tag',
        id: '5',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'smarmy'
        }
      }, {
        type: 'tag',
        id: '12',
        attributes: {
          name: 'oohlala'
        }
      }]
    });
    records = store.peekAll('tag');
    internalModel = Ember.A(records).mapBy('_internalModel');
    tags = DS.RecordArray.create({ content: Ember.A(internalModel.slice(0, 2)), store: store, type: Tag });
  });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  run(function() {
    set(tags, 'content', Ember.A(internalModel.slice(1, 3)));
  });

  tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

test("can create child record from a hasMany relationship", function() {
  expect(3);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom Dale"
        }
      }
    });
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      person.get("tags").createRecord({ name: "cool" });

      equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
      equal(get(person, 'tags.length'), 1, "tag is added to the parent record");
      equal(get(person, 'tags').objectAt(0).get("name"), "cool", "tag values are passed along");
    }));
  });
});

