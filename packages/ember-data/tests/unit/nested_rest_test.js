var get = Ember.get, set = Ember.set;

var adapter, store, ajaxUrl, ajaxType, ajaxHash;
var Person, person, people;
var Role, role, roles;
var Group, group;

module("the Nested REST adapter", {
  setup: function() {
    ajaxUrl = undefined;
    ajaxType = undefined;
    ajaxHash = undefined;
    
    var Adapter = DS.RESTAdapter.extend();
    Adapter.configure('plurals', {
      person: 'people'
    });
    
    adapter = Adapter.create({
      ajax: function(url, type, hash) {
        var success = hash.success, self = this;

        ajaxUrl = url;
        ajaxType = type;
        ajaxHash = hash;

        if (success) {
          hash.success = function(json) {
            success.call(self, json);
          };
        }
      }
    });

    store = DS.Store.create({
      adapter: adapter
    });

    Person=DS.Model.extend({
      name: DS.attr('string')
    });

    Person.toString = function() {
      return "App.Person";
    };      

    Group=DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany(Person)
    });
    
    Person.reopen({
      group: DS.belongsTo(Group, {nested: true})
    });

    Group.toString = function() {
      return "App.Group";
    };

  },

  teardown: function() {
    if (group) { 
      group.destroy(); 
      group=null;
    }
    if (person) { 
      person.destroy(); 
      person=null;
    }

    adapter.destroy();
    store.destroy();

  }
});

var expectUrl = function(url, desc) {
  equal(ajaxUrl, url, "the URL is " + desc);
};

var expectType = function(type) {
  equal(type, ajaxType, "the HTTP method is " + type);
};


test("creating a nested person makes a POST to /group/<group_id>/people", function() {
  store.loadMany(Group, [{ id: 1, name: "Non Programmers" },
                         { id: 2, name: "Programmers"}] );
  group=store.find(Group, 2);
  person=group.get('people').createRecord({ name: "Tom Walpole"});
  store.commit();
  expectUrl("/groups/2/people", "the nested collection at the plural of the model name scoped by the parent resource");
  expectType("POST");
  ajaxHash.success({ person: { id: 1, name: "Tom Walpole", group_id: 2 } });
});

test("updating a nested person makes a PUT to /group/<group_id>/people/:id", function() {  
  store.load(Group, { id: 1, name: "Programmers", people: [1] });
  store.load(Person, { id: 1, name: "Tom Walpole", group_id: 1 });

  person = store.find(Person, 1);

  set(person, 'name', "Brohuda Brokatz");
  store.commit();

  expectUrl("/groups/1/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success();
});

test("deleting a person makes a DELETE to /group/<group_id>/people/:id", function() {
  store.load(Group, { id: 1, name: "Programmers", people: [1] });
  store.load(Person, { id: 1, name: "Tom Walpole", group_id: 1 });
  
  person = store.find(Person, 1);

  person.deleteRecord();
  store.commit();

  expectUrl("/groups/1/people/1", "the plural of the model name with its ID");
  expectType("DELETE");
  
  ajaxHash.success();
});

test("finding all nested people through a group makes a GET to /groups/<group_id>/people", function() {
  store.load(Group, { id: 2, name: "Programmers", person_ids: [1,2] });
  group = store.find(Group, 2);
  
  people = group.get('people');

  expectUrl("/groups/2/people", "the nested plural of the model name");
  expectType("GET");

  ajaxHash.success({ people: [{ id: 1, name: "Yehuda Katz", group_id: 2 },
                              { id: 2, name: "Thomas Walpole", group_id: 2} ] });

  person = people.objectAt(0);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

