var attr = DS.attr;
var belongsTo = DS.belongsTo;
var hasMany = DS.hasMany;
var run = Ember.run;
var env;

var Person = DS.Model.extend({
  name: attr('string'),
  cars: hasMany('car')
});

var Car = DS.Model.extend({
  make: attr('string'),
  model: attr('string'),
  person: belongsTo('person')
});

Person.toString = function() { return "Person"; };

module("integration/unload - Unloading Records", {
  setup: function() {
   env = setupStore({
     person: Person,
     car: Car
   });
  },

  teardown: function() {
    Ember.run(function(){
      env.container.destroy();
    });
  }
});

test("can unload a single record", function () {
  var adam;
  run(function(){
    adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
  });

  Ember.run(function(){
    adam.unloadRecord();
  });

  equal(env.store.all('person').get('length'), 0);
});

test("can unload all records for a given type", function () {
  var adam, bob;
  run(function(){
    adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
    bob = env.store.push('person', {id: 2, name: "Bob Bobson"});
  });

  Ember.run(function(){
    env.store.unloadAll('person');
  });

  equal(env.store.all('person').get('length'), 0);
});

test("removes findAllCache after unloading all records", function () {
  var adam, bob;
  run(function(){
    adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
    bob = env.store.push('person', {id: 2, name: "Bob Bobson"});
  });

  Ember.run(function(){
    env.store.all('person');
    env.store.unloadAll('person');
  });

  equal(env.store.all('person').get('length'), 0);
});

test("unloading all records also updates record array from all()", function() {
  var adam, bob;
  run(function(){
    adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
    bob = env.store.push('person', {id: 2, name: "Bob Bobson"});
  });
  var all = env.store.all('person');

  equal(all.get('length'), 2);

  Ember.run(function(){
    env.store.unloadAll('person');
  });

  equal(all.get('length'), 0);
});


//TODO(Igor) think about how this works with ssot and unloading
test("unloading a record also clears its relationship", function() {
  var adam, bob;
  run(function(){
    adam = env.store.push('person', {
      id: 1,
      name: "Adam Sunderland",
      cars: [1]
    });
  });

  run(function(){
    bob = env.store.push('car', {
      id: 1,
      make: "Lotus",
      model: "Exige",
      person: 1
    });
  });

  run(function(){
    env.store.find('person', 1).then(function(person){
      equal(person.get('cars.length'), 1, 'aaaa');

      run(function(){
        person.unloadRecord();
      });

      equal(person.get('cars.length'), undefined);
    });
  });
});
