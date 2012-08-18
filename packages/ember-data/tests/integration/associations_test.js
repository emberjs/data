var get = Ember.get, set = Ember.set;

var store, adapter, Comment;

module("Associations", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });

    Comment = DS.Model.extend();
    Comment.reopen({
      body: DS.attr('string'),
      comments: DS.hasMany(Comment),
      comment: DS.belongsTo(Comment)
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("when modifying a child record's belongsTo relationship, its parent hasMany relationships should be updated", function() {
  // Changes to one side should not require run-loop synchronization to
  // propagate to the other side
  Ember.run(function() {
    store.load(Comment, { id: 1, body: "parent" });
    store.load(Comment, { id: 2, body: "child" });

    var parent = store.find(Comment, 1), child = store.find(Comment, 2);

    equal(parent.get('comments.length'), 0, "precond - the parent has no child comments yet");

    child.set('comment', parent);

    deepEqual(parent.get('comments').toArray(), [ child ] , "there should be a child comment");

    child.set('comment', null);

    deepEqual(parent.get('comments').toArray(), [ ], "the parent comments array should be empty");
  });
});

test("an association has an isLoaded flag that indicates whether the ManyArray has finished loaded", function() {
  expect(8);

  var array, hasLoaded;

  adapter.find = function(store, type, id) {
    setTimeout(async(function() {
      equal(array.get('isLoaded'), false, "Before loading, the array isn't isLoaded");
      store.load(type, { id: id });

      if (id === 3) {
        equal(array.get('isLoaded'), true, "After loading all records, the array isLoaded");
      } else {
        equal(array.get('isLoaded'), false, "After loading some records, the array isn't isLoaded");
      }
    }), 1);
  };

  array = store.findMany(Comment, [ 1, 2, 3 ]);

  array.on('didLoad', function() {
    ok(true, "didLoad was triggered");
  });

  equal(get(array, 'isLoaded'), false, "isLoaded should not be true when first created");
});

var Person;

test("When a hasMany association is accessed, the adapter's findMany method should not be called if all the records in the association are already loaded", function() {
  expect(0);

  adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  Person = DS.Model.extend({
    updatedAt: DS.attr('string'),
    name: DS.attr('string')
  });

  Comment = DS.Model.extend({
    person: DS.belongsTo(Person)
  });

  Person.reopen({
    comments: DS.hasMany(Comment)
  });

  store.load(Person, { id: 1, comments: [ 1 ] });
  store.load(Comment, { id: 1 });

  var person = store.find(Person, 1);

  person.get('comments');

  store.load(Person, { id: 1, comments: [ 1 ] });
});

//test("When a record with a hasMany association is deleted, its associated record is materialized and its belongsTo is changed", function() {
  //expect(3);

  //adapter.findMany = function(store, type, ids) {
    //setTimeout(async(function() {
      //// loading the comment doesn't raise an exception
      //store.load(Comment, { id: 2, person: 1 });
    //}), 1);
  //};

  //adapter.updateRecord = function(store, type, record) {
    //var comment = store.find(Comment, 2);
    //equal(record, comment, "The record passed to update is the child record");
    //equal(comment.get('person'), null, "The comment's person is null");
  //};

  //adapter.deleteRecord = function(store, type, record) {
    //equal(record, person, "the person is deleted as expected");
  //};

  //Person = DS.Model.extend({
    //updatedAt: DS.attr('string'),
    //name: DS.attr('string')
  //});

  //Person.toString = function() { return "Person"; };

  //Comment = DS.Model.extend({
    //person: DS.belongsTo(Person)
  //});

  //Comment.toString = function() { return "Comment"; };

  //Person.reopen({
    //comments: DS.hasMany(Comment)
  //});

  //store.load(Person, { id: 1, name: "Tom Dale", comments: [ 2 ] });

  //var person = store.find(Person, 1);

  //person.deleteRecord();

  //store.commit();
//});
