var get = Ember.get, set = Ember.set;

var Person, store, payload;

module("integration/push_payload_and_create_record - pushing a payload and ", {
  setup: function() {
    Person = DS.Model.extend({ name: DS.attr('string') });
    payload = {people: [{name: "Alex", id: 1}]};

    store = createStore({ person: Person,
      adapter: DS.RESTAdapter.extend({
        createRecord: function(store, type, record) {
          var promise = new Em.RSVP.Promise(function(resolve, reject){
            Em.run.later(function() {
              start();
              resolve(payload);
            }, 100);
          });
          return promise;
        }
      })
    });
  },
  teardown: function() {
    store.destroy();
    Person = null;
    paylod = null;
  }
});


test("pushPayload and createRecord should live together in harmony", function () {

  var person = store.createRecord(Person, {name: "Alex"});

  person.save().then(function(person) {
    equal(get(person, 'id'), '1');
    equal(get(person, 'name'), 'Alex');
    equal(get(store.all('person'), 'length'), 1);
  });

  store.pushPayload(Person, payload);
  stop();
});
