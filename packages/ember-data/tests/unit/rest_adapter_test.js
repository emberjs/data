var get = Ember.get, set = Ember.set;

var adapter, store, ajaxUrl, ajaxType, ajaxHash, ajaxErrorHandler;
var userErrorHandlerXhr, userErrorHandlerAction, userErrorHandlerModels;
var Person, person, people;
var Role, role, roles;
var Group, group;

module("the REST adapter", {
  setup: function() {
    resetMockXhr();

    adapter = DS.RESTAdapter.create({
      jQuery: {
        ajax: function( hash ) {
          var success = hash.success;

          ajaxUrl = hash.url;
          ajaxType = hash.type;
          ajaxHash = hash;
          ajaxErrorHandler = hash.error;

          if(hash.data && typeof(hash.data) === "string") {
            hash.data = JSON.parse(hash.data);
          }

          if (success) {
            hash.success = function(json) {
              success.call(store.adapter, json);
            };
          }
        }
      },

      error: function( jqXhr, textStatus, errorThrown, emberParams ) {
        userErrorHandlerXhr = jqXhr;
        userErrorHandlerAction = emberParams.action;
        userErrorHandlerModels = emberParams.models;
      },

      plurals: {
        person: 'people'
      }
    });

    store = DS.Store.create({
      adapter: adapter
    });

    Person = DS.Model.extend({
      name: DS.attr('string')
    });

    Person.toString = function() {
      return "App.Person";
    };

    Group = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany(Person)
    });

    Group.toString = function() {
      return "App.Group";
    };

    Role = DS.Model.extend({
      name: DS.attr('string'),
      primaryKey: '_id'
    });

    Role.toString = function() {
      return "App.Role";
    };
  },

  teardown: function() {
    if (person) {
      if( person.get('isSaving')) {
        person.get('stateManager').goToState('saved');
      }
      person.destroy();
    }

    store.destroy();
    adapter.destroy();
  }
});

var resetMockXhr = function() {
  ajaxUrl =
    ajaxType =
    ajaxHash =
    ajaxErrorHandler =
    userErrorHandlerXhr =
    userErrorHandlerAction =
    userErrorHandlerModels = undefined;
};

var expectUrl = function(url, desc) {
  equal(ajaxUrl, url, "the URL is " + desc);
};

var expectType = function(type) {
  equal(type, ajaxType, "the HTTP method is " + type);
};

var expectData = function(hash) {
  deepEqual(hash, ajaxHash.data, "the hash was passed along");
};

var expectState = function(state, value, p) {
  p = p || person;

  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(get(p, flag), value, "the person is " + (value === false ? "not " : "") + state);
};

var expectStates = function(state, value) {
  people.forEach(function(person) {
    expectState(state, value, person);
  });
};

var expectNoErrorHandlerInvoked = function( mockXhr ) {
  mockXhr = mockXhr || {};
  equal( typeof( ajaxErrorHandler ), "function", "RESTAdapter supplies an error handler to jQuery.ajax.");
  ajaxErrorHandler( mockXhr, 'error', 'synthetic error'); // should not raise error, in particular no 'no method' error
};

var expectUserErrorHandlerInvoked = function( action, models ) {
  var mockXhr = {};
  if( arguments.length < 2 ){ models = [person]; }

  equal( typeof( ajaxErrorHandler ), "function", "RESTAdapter supplies an error handler to jQuery.ajax.");
  ajaxErrorHandler( mockXhr, 'error', 'synthetic error');
  strictEqual( userErrorHandlerXhr, mockXhr, "User supplied error handlers are invoked on jQuery.ajax errors and passed jqXhr.");
  strictEqual( userErrorHandlerAction, action, "User supplied error handlers are invoked on jQuery.ajax errors and passed action.");
  deepEqual( userErrorHandlerModels, models, "User supplied error handlers are invoked on jQuery.ajax errors and passed models.");
};

var expectModelMarkedInvalidFromXhr = function( errors ) {
  equal( typeof( ajaxErrorHandler ), "function", "RESTAdapter supplies an error handler to jQuery.ajax.");

  var mockXhr = {
    status:       422,
    responseText: JSON.stringify({ errors: errors })
  };
  ajaxErrorHandler( mockXhr, 'error', 'synthetic error');

  equal( person.get('isValid'), false, "Person is valid.");
  deepEqual( person.get('errors'), errors, "Person has errors set.");
  strictEqual( userErrorHandlerXhr, undefined, "User supplied error handlers are not invoked on jQuery.ajax 422 error.");
};

test("creating a single record with a server error invokes the user-specified error handler", function() {
  set(adapter, 'bulkCommit', false);

  person = store.createRecord(Person, { name: "Cyril Fluck" });
  store.commit();
  expectUserErrorHandlerInvoked('create');
});

test("updating a single record with a server error invokes the user-specified error handler", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "David J. Hamilton" });
  person = store.find( Person, 1 );
  person.set( 'name', 'Cyril Fluck');
  store.commit();
  expectUserErrorHandlerInvoked('update');
});

test("deleting a single record with a server error invokes the user-specified error handler", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "David J. Hamilton" });
  person = store.find( Person, 1 );
  person.deleteRecord();
  store.commit();
  expectUserErrorHandlerInvoked('delete');
});

test("creating a record with a 422 and no user-specified error handler does not raise an exception", function() {
  set(adapter, 'bulkCommit', false);

  person = store.createRecord(Person, { name: "Cyril Fluck" });
  store.commit();

  expectNoErrorHandlerInvoked({ status: 422, responseText: JSON.stringify({ errors: {}}) });
});

test("updating a record with a 422 and no user-specified error handler does not raise an exception", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "David J. Hamilton" });
  person = store.find( Person, 1 );
  person.set( 'name', 'Cyril Fluck');
  store.commit();

  expectNoErrorHandlerInvoked({ status: 422, responseText: JSON.stringify({ errors: {}}) });
});

test("creating a record with a 422 error marks the records as invalid", function(){
  set(adapter, 'bulkCommit', false);

  person = store.createRecord(Person, { name: "Cyril Fluck" });
  store.commit();
  expectModelMarkedInvalidFromXhr({ name: ["is French"]});
  deepEqual( person.get('errors').name, ["is French"]);
});

test("updating a record with a 422 error marks the records as invalid", function(){
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "David J. Hamilton" });
  person = store.find( Person, 1 );
  person.set('name', 'Cyril Fluck');
  store.commit();
  expectModelMarkedInvalidFromXhr({ name: ["is English"]});
  deepEqual( person.get('errors').name, ["is English"]);
});

test("finding a person by ID with a server error invokes the user-specified error handler", function() {
  store.find( Person, 1 );
  expectUserErrorHandlerInvoked('find', undefined);
});

test("finding many people by a list of IDs with a server error invokes the user-specified error handler", function() {
  store.findMany( Person, [1,2,3]);
  expectUserErrorHandlerInvoked('find', undefined);
});

test("finding all people with a server error invokes the user-specified error handler", function() {
  store.findAll( Person );
  expectUserErrorHandlerInvoked('find', undefined);
});

test("finding people by a query with a server error invokes the user-specified error handler", function() {
  store.find( Person, { page: 1 });
  expectUserErrorHandlerInvoked('find', undefined);
});

test("creating a person makes a POST to /people, with the data hash", function() {
  set(adapter, 'bulkCommit', false);

  person = store.createRecord(Person, { name: "Tom Dale" });

  expectState('new');
  store.commit();
  expectState('saving');

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ person: { name: "Tom Dale" } });

  ajaxHash.success({ person: { id: 1, name: "Tom Dale" } });
  expectState('saving', false);

  equal(person, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
});

test("singular creations can sideload data", function() {
  set(adapter, 'bulkCommit', false);

  adapter.mappings = {
    groups: Group
  };

  person = store.createRecord(Person, { name: "Tom Dale" });

  expectState('new');
  store.commit();
  expectState('saving');

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ person: { name: "Tom Dale" } });

  ajaxHash.success({
    person: { id: 1, name: "Tom Dale" },
    groups: [{ id: 1, name: "Group 1" }]
  });

  expectState('saving', false);

  equal(person, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");

  group = store.find(Group, 1);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("updating a person makes a PUT to /people/:id with the data hash", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success({ person: { id: 1, name: "Brohuda Brokatz" } });
  expectState('saving', false);

  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(person, 'name'), "Brohuda Brokatz", "the hash should be updated");
});

test("updates are not required to return data", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success();
  expectState('saving', false);

  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(person, 'name'), "Brohuda Brokatz", "the data is preserved");
});

test("singular updates can sideload data", function() {
  set(adapter, 'bulkCommit', false);

  adapter.mappings = {
    groups: Group
  };

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success({
    person: { id: 1, name: "Brohuda Brokatz" },
    groups: [{ id: 1, name: "Group 1" }]
  });

  expectState('saving', false);

  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");

  group = store.find(Group, 1);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("updating a record with custom primaryKey", function() {
  set(adapter, 'bulkCommit', false);
  store.load(Role, { _id: 1, name: "Developer" });

  role = store.find(Role, 1);

  set(role, 'name', "Manager");
  store.commit();

  expectUrl("/roles/1", "the plural of the model name with its ID");
  ajaxHash.success({ role: { _id: 1, name: "Manager" } });
});


test("deleting a person makes a DELETE to /people/:id", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Tom Dale" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  person.deleteRecord();

  expectState('dirty');
  expectState('deleted');
  store.commit();
  expectState('saving');

  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("DELETE");

  ajaxHash.success();
  expectState('deleted');
});

test("singular deletes can sideload data", function() {
  set(adapter, 'bulkCommit', false);

  adapter.mappings = {
    groups: Group
  };

  store.load(Person, { id: 1, name: "Tom Dale" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  person.deleteRecord();

  expectState('dirty');
  expectState('deleted');
  store.commit();
  expectState('saving');

  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("DELETE");

  ajaxHash.success({
    groups: [{ id: 1, name: "Group 1" }]
  });

  expectState('deleted');

  group = store.find(Group, 1);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("deleting a record with custom primaryKey", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Role, { _id: 1, name: "Developer" });

  role = store.find(Role, 1);

  role.deleteRecord();

  store.commit();

  expectUrl("/roles/1", "the plural of the model name with its ID");
  ajaxHash.success();
});

test("finding all people makes a GET to /people", function() {
  people = store.find(Person);

  expectUrl("/people", "the plural of the model name");
  expectType("GET");

  ajaxHash.success({ people: [{ id: 1, name: "Yehuda Katz" }] });

  person = people.objectAt(0);

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding all can sideload data", function() {
  var groups = store.find(Group);

  expectUrl("/groups", "the plural of the model name");
  expectType("GET");

  ajaxHash.success({
    groups: [{ id: 1, name: "Group 1", people: [ 1 ] }],
    people: [{ id: 1, name: "Yehuda Katz" }]
  });

  people = get(groups.objectAt(0), 'people');
  person = people.objectAt(0);

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding a person by ID makes a GET to /people/:id", function() {
  person = store.find(Person, 1);

  expectState('loaded', false);
  expectUrl("/people/1", "the plural of the model name with the ID requested");
  expectType("GET");

  ajaxHash.success({ person: { id: 1, name: "Yehuda Katz" } });

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("additional data can be sideloaded in a GET", function() {
  group = store.find(Group, 1);

  ajaxHash.success({
    group: {
      id: 1, name: "Group 1", people: [ 1 ]
    },
    people: [{
      id: 1, name: "Yehuda Katz"
    }]
  });

  equal(get(store.find(Person, 1), 'name'), "Yehuda Katz", "the items are sideloaded");
  equal(get(get(store.find(Group, 1), 'people').objectAt(0), 'name'), "Yehuda Katz", "the items are in the association");
});

test("finding many people by a list of IDs", function() {
  store.load(Group, { id: 1, people: [ 1, 2, 3 ] });

  var group = store.find(Group, 1);

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  var people = get(group, 'people');

  equal(get(people, 'length'), 3, "there are three people in the association already");

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), false, "the person is being loaded");
  });

  expectUrl("/people");
  expectType("GET");
  expectData({ ids: [ 1, 2, 3 ] });

  ajaxHash.success({
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("additional data can be sideloaded in a GET with many IDs", function() {
  //store.load(Group, { id: 1, people: [ 1, 2, 3 ] });

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  // findMany is used here even though it is not normally public to test the
  // functionality.
  var groups = store.findMany(Group, [ 1 ]);
  var group = groups.objectAt(0);

  equal(get(group, 'isLoaded'), false, "the group is being loaded");

  expectUrl("/groups");
  expectType("GET");
  expectData({ ids: [ 1 ] });

  ajaxHash.success({
    groups: [
      { id: 1, people: [ 1, 2, 3 ] }
    ],
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  var people = get(group, 'people');
  equal(get(people, 'length'), 3, "the people have length");

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("finding people by a query", function() {
  var people = store.find(Person, { page: 1 });

  equal(get(people, 'length'), 0, "there are no people yet, as the query has not returned");

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("GET");
  expectData({ page: 1 });

  ajaxHash.success({
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  equal(get(people, 'length'), 3, "the people are now loaded");

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("finding people by a query can sideload data", function() {
  var groups = store.find(Group, { page: 1 });

  equal(get(groups, 'length'), 0, "there are no groups yet, as the query has not returned");

  expectUrl("/groups", "the collection at the plural of the model name");
  expectType("GET");
  expectData({ page: 1 });

  ajaxHash.success({
    groups: [
      { id: 1, name: "Group 1", people: [ 1, 2, 3 ] }
    ],
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  var group = groups.objectAt(0);
  var people = get(group, 'people');

  equal(get(people, 'length'), 3, "the people are now loaded");

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("creating several people (with bulkCommit) makes a POST to /people, with a data hash Array", function() {
  var tom = store.createRecord(Person, { name: "Tom Dale" });
  var yehuda = store.createRecord(Person, { name: "Yehuda Katz" });

  people = [ tom, yehuda ];

  expectStates('new');
  store.commit();
  expectStates('saving');

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ people: [ { name: "Tom Dale" }, { name: "Yehuda Katz" } ] });

  ajaxHash.success({ people: [ { id: 1, name: "Tom Dale" }, { id: 2, name: "Yehuda Katz" } ] });
  expectStates('saving', false);

  equal(tom, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
  equal(yehuda, store.find(Person, 2), "it is now possible to retrieve the person by the ID supplied");
});

test("bulk commits can sideload data", function() {
  var tom = store.createRecord(Person, { name: "Tom Dale" });
  var yehuda = store.createRecord(Person, { name: "Yehuda Katz" });

  adapter.mappings = { groups: Group };

  people = [ tom, yehuda ];

  expectStates('new');
  store.commit();
  expectStates('saving');

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ people: [ { name: "Tom Dale" }, { name: "Yehuda Katz" } ] });

  ajaxHash.success({
    people: [ { id: 1, name: "Tom Dale" }, { id: 2, name: "Yehuda Katz" } ],
    groups: [ { id: 1, name: "Group 1" } ]
  });

  expectStates('saving', false);

  equal(tom, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
  equal(yehuda, store.find(Person, 2), "it is now possible to retrieve the person by the ID supplied");

  group = store.find(Group, 1);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("updating several people (with bulkCommit) makes a PUT to /people/bulk with the data hash Array", function() {
  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);

  var yehuda = store.find(Person, 1);
  var carl = store.find(Person, 2);

  people = [ yehuda, carl ];

  expectStates('new', false);
  expectStates('loaded');
  expectStates('dirty', false);

  set(yehuda, 'name', "Brohuda Brokatz");
  set(carl, 'name', "Brocarl Brolerche");

  expectStates('dirty');
  store.commit();
  expectStates('saving');

  expectUrl("/people/bulk", "the collection at the plural of the model name");
  expectType("PUT");

  ajaxHash.success({ people: [
    { id: 1, name: "Brohuda Brokatz" },
    { id: 2, name: "Brocarl Brolerche" }
  ]});

  expectStates('saving', false);

  equal(yehuda, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(carl, store.find(Person, 2), "the same person is retrieved by the same ID");
});

test("bulk updates can sideload data", function() {
  adapter.mappings = {
    groups: Group
  };

  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);

  var yehuda = store.find(Person, 1);
  var carl = store.find(Person, 2);

  people = [ yehuda, carl ];

  expectStates('new', false);
  expectStates('loaded');
  expectStates('dirty', false);

  set(yehuda, 'name', "Brohuda Brokatz");
  set(carl, 'name', "Brocarl Brolerche");

  expectStates('dirty');
  store.commit();
  expectStates('saving');

  expectUrl("/people/bulk", "the collection at the plural of the model name");
  expectType("PUT");

  ajaxHash.success({
    people: [
      { id: 1, name: "Brohuda Brokatz" },
      { id: 2, name: "Brocarl Brolerche" }
    ],
    groups: [{ id: 1, name: "Group 1" }]
  });

  expectStates('saving', false);

  equal(yehuda, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(carl, store.find(Person, 2), "the same person is retrieved by the same ID");

  group = store.find(Group, 1);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("deleting several people (with bulkCommit) makes a PUT to /people/bulk", function() {
  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);

  var yehuda = store.find(Person, 1);
  var carl = store.find(Person, 2);

  people = [ yehuda, carl ];

  expectStates('new', false);
  expectStates('loaded');
  expectStates('dirty', false);

  yehuda.deleteRecord();
  carl.deleteRecord();

  expectStates('dirty');
  expectStates('deleted');
  store.commit();
  expectStates('saving');

  expectUrl("/people/bulk", "the collection at the plural of the model name with 'delete'");
  expectType("DELETE");

  ajaxHash.success();

  expectStates('saving', false);
  expectStates('deleted');
  expectStates('dirty', false);
});

test("bulk deletes can sideload data", function() {
  adapter.mappings = {
    groups: Group
  };

  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);

  var yehuda = store.find(Person, 1);
  var carl = store.find(Person, 2);

  people = [ yehuda, carl ];

  expectStates('new', false);
  expectStates('loaded');
  expectStates('dirty', false);

  yehuda.deleteRecord();
  carl.deleteRecord();

  expectStates('dirty');
  expectStates('deleted');
  store.commit();
  expectStates('saving');

  expectUrl("/people/bulk", "the collection at the plural of the model name with 'delete'");
  expectType("DELETE");

  ajaxHash.success({
    groups: [{ id: 1, name: "Group 1" }]
  });

  expectStates('saving', false);
  expectStates('deleted');
  expectStates('dirty', false);

  group = store.find(Group, 1);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("if you specify a namespace then it is prepended onto all URLs", function() {
  set(adapter, 'namespace', 'ember');
  person = store.find(Person, 1);
  expectUrl("/ember/people/1", "the namespace, followed by by the plural of the model name and the id");

  store.load(Person, { id: 1 });
});

