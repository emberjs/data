module("Record Loading", {

});

test("after loading a record, a subsequent find materializes the record through the serializer", function() {
  expect(1);

  var Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string')
  });

  var adapter = DS.Adapter.create(),
      serializer = adapter.serializer,
      store = DS.Store.create({ adapter: adapter });

  serializer.extractId = function(type, data) {
    ok(false, "extraction is skipped since the id was already provided");
  };

  serializer.extractAttribute = function(type, data, name) {
    return data[name];
  };

  serializer.keyForAttributeName = function(type, name) {
    return name;
  };

  store.load(Person, { id: 1, firstName: "Yehuda", lastName: "Katz" }, { id: 1 });

  var person = store.find(Person, 1);
  equal(person.get('firstName'), "Yehuda", "getting an attribute returned the right value");
});
