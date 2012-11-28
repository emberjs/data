var store, adapter, Post, Comment;

module("REST Adapter") ;

//test("changing A=>null=>A should clean up the record", function() {
  //var store = DS.Store.create({
    //adapter: DS.RESTAdapter
  //});
  //var Kidney = DS.Model.extend();
  //var Person = DS.Model.extend();

  //Kidney.reopen({
    //person: DS.belongsTo(Person)
  //});
  //Kidney.toString = function() { return "Kidney"; };

  //Person.reopen({
    //name: DS.attr('string'),
    //kidneys: DS.hasMany(Kidney)
  //});
  //Person.toString = function() { return "Person"; };

  //store.load(Person, { id: 1, kidneys: [1, 2] });
  //store.load(Kidney, { id: 1, person: 1 });
  //store.load(Kidney, { id: 2, person: 1 });

  //var person = store.find(Person, 1);
  //var kidney1 = store.find(Kidney, 1);
  //var kidney2 = store.find(Kidney, 2);

  //deepEqual(person.get('kidneys').toArray(), [kidney1, kidney2], "precond - person should have both kidneys");
  //equal(kidney1.get('person'), person, "precond - first kidney should be in the person");

  //person.get('kidneys').removeObject(kidney1);

  //ok(person.get('isDirty'), "precond - person should be dirty after operation");
  //ok(kidney1.get('isDirty'), "precond - first kidney should be dirty after operation");

  //deepEqual(person.get('kidneys').toArray(), [kidney2], "precond - person should have only the second kidney");
  //equal(kidney1.get('person'), null, "precond - first kidney should be on the operating table");

  //person.get('kidneys').addObject(kidney1);

  //ok(!person.get('isDirty'), "person should be clean after restoration");
  //ok(!kidney1.get('isDirty'), "first kidney should be clean after restoration");

  //deepEqual(person.get('kidneys').toArray(), [kidney2, kidney1], "person should have both kidneys again");
  //equal(kidney1.get('person'), person, "first kidney should be in the person again");
//});

//test("changing A=>B=>A should clean up the record", function() {
  //var store = DS.Store.create({
    //adapter: DS.RESTAdapter
  //});
  //var Kidney = DS.Model.extend();
  //var Person = DS.Model.extend();

  //Kidney.reopen({
    //person: DS.belongsTo(Person)
  //});
  //Kidney.toString = function() { return "Kidney"; };

  //Person.reopen({
    //name: DS.attr('string'),
    //kidneys: DS.hasMany(Kidney)
  //});
  //Person.toString = function() { return "Person"; };

  //store.load(Person, { person: { id: 1, name: "John Doe", kidneys: [1, 2] }});
  //store.load(Person, { person: { id: 2, name: "Jane Doe", kidneys: [3]} });
  //store.load(Kidney, { kidney: { id: 1, person_id: 1 } });
  //store.load(Kidney, { kidney: { id: 2, person_id: 1 } });
  //store.load(Kidney, { kidney: { id: 3, person_id: 2 } });

  //var john = store.find(Person, 1);
  //var jane = store.find(Person, 2);
  //var kidney1 = store.find(Kidney, 1);
  //var kidney2 = store.find(Kidney, 2);
  //var kidney3 = store.find(Kidney, 3);

  //deepEqual(john.get('kidneys').toArray(), [kidney1, kidney2], "precond - john should have the first two kidneys");
  //deepEqual(jane.get('kidneys').toArray(), [kidney3], "precond - jane should have the third kidney");
  //equal(kidney2.get('person'), john, "precond - second kidney should be in john");

  //kidney2.set('person', jane);

  //ok(john.get('isDirty'), "precond - john should be dirty after operation");
  //ok(jane.get('isDirty'), "precond - jane should be dirty after operation");
  //ok(kidney2.get('isDirty'), "precond - second kidney should be dirty after operation");

  //deepEqual(john.get('kidneys').toArray(), [kidney1], "precond - john should have only the first kidney");
  //deepEqual(jane.get('kidneys').toArray(), [kidney3, kidney2], "precond - jane should have the other two kidneys");
  //equal(kidney2.get('person'), jane, "precond - second kidney should be in jane");

  //kidney2.set('person', john);

  //ok(!john.get('isDirty'), "john should be clean after restoration");
  //ok(!jane.get('isDirty'), "jane should be clean after restoration");
  //ok(!kidney2.get('isDirty'), "second kidney should be clean after restoration");

  //deepEqual(john.get('kidneys').toArray(), [kidney1, kidney2], "john should have the first two kidneys again");
  //deepEqual(jane.get('kidneys').toArray(), [kidney3], "jane should have the third kidney again");
  //equal(kidney2.get('person'), john, "second kidney should be in john again");
//});
