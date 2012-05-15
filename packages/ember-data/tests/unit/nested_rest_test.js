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

    adapter = DS.RESTAdapter.create({
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
      },

      plurals: {
        person: 'people'
      }
    });

    store = DS.Store.create({
      adapter: adapter
    });

    Person=DS.Model.extend();

    Group=DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany(Person)
    });
    
    Person.reopen({
      name: DS.attr('string'),
      group: DS.belongsTo(Group, {nested: true})
    });

    Person.toString = function() {
      return "App.Person";
    };
        
    Group.toString = function() {
      return "App.Group";
    };

  },

  teardown: function() {
    adapter.destroy();
    store.destroy();

    if (person) { person.destroy(); }
    if (group) { group.destroy(); }
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
  var grp=store.find(Group, 2);
  var record=grp.get('people').createRecord({ name: "Tom Walpole"});
  store.commit();
  expectUrl("/groups/2/people", "the nested collection at the plural of the model name scoped by the parent resource");
  expectType("POST");
  ajaxHash.success({ person: { id: 1, name: "Tom Walpole", group_id: 2 } });
});

test("updating a nested person makes a PUT to /group/<group_id>/people/:id", function() {  
  store.load(Group, { id: 1, name: "Programmers", people_ids: [1] });
  store.load(Person, { id: 1, name: "Tom Walpole", group_id: 1 });

  person = store.find(Person, 1);

  set(person, 'name', "Brohuda Brokatz");

  store.commit();

  expectUrl("/groups/1/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success();
});

test("deleting a person makes a DELETE to /group/<group_id>/people/:id", function() {
  store.load(Group, { id: 1, name: "Programmers", people_ids: [1] });
  store.load(Person, { id: 1, name: "Tom Walpole", group_id: 1 });
  
  person = store.find(Person, 1);

  person.deleteRecord();

  store.commit();

  expectUrl("/groups/1/people/1", "the plural of the model name with its ID");
  expectType("DELETE");
  
  ajaxHash.success();
});
