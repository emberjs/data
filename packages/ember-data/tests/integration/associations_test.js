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
    Ember.run(function() {
      store.destroy();
    });
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

      if (id === '3') {
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

test("An adapter can materialize a hash and get it back later in a findAssociation hook", function() {
  expect(8);

  stop();

  Person = DS.Model.extend({
    updatedAt: DS.attr('string'),
    name: DS.attr('string')
  });

  Person.toString = function() { return "Person"; };

  Comment = DS.Model.extend({
    person: DS.belongsTo(Person)
  });

  Comment.toString = function() { return "Comment"; };

  Person.reopen({
    comments: DS.hasMany(Comment)
  });

  adapter.set('serializer.extractHasMany', function(record, hash, relationship) {
    return { url: hash.comments };
  });

  adapter.find = function(store, type, id) {
    equal(type, Person);
    equal(id, 1);

    setTimeout(function() {
      store.load(Person, { id: 1, comments: "/posts/1/comments" });
      next();
    }, 1);
  };

  adapter.findMany = function() {
    start();
    throw new Error("Should not get here");
  };

  adapter.findAssociation = function(store, record, relationship, details) {
    equal(relationship.type, Comment);
    equal(relationship.key, 'comments');
    equal(details.url, "/posts/1/comments");

    setTimeout(function() {
      store.loadMany(relationship.type, [
        { id: 1, body: "First" },
        { id: 2, body: "Second" }
      ]);

      store.materializeHasMany(record, relationship.key, [ 1, 2 ]);

      setTimeout(function() {
        done();
      }, 1);
    }, 1);
  };

  var person = store.find(Person, 1), comments;

  function next() {
    comments = person.get('comments');
    equal(comments.get('isLoaded'), false);
  }

  function done() {
    start();
    equal(comments.get('isLoaded'), true);
    equal(comments.get('length'), 2);
  }
});

test("When adding a child to a parent, then commit, the parent should come back to a clean state", function() {
  expect(2);

  adapter.dirtyRecordsForHasManyChange = Ember.K;

  var didSaveRecord = function(store, record, hash) {
    record.eachAssociation(function(name, meta) {
      if (meta.kind === 'belongsTo') {
        store.didUpdateRelationship(record, name);
      }
    });

    store.didSaveRecord(record, hash);
  };

  adapter.createRecord = function(store, type, record) {
    didSaveRecord(store, record, this.serialize(record));
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

  store.load(Person, { id: 1});
  var person = store.find(Person, 1);

  person.get('comments').createRecord();
  store.commit();
  equal(person.get('isDirty'), false, "The record should no longer be dirty");
  equal(person.get('isSaving'), false, "The record should no longer be saving");

  //equal(person.get('stateManager.currentState.path'), "rootState.loaded.saved");
});

test("deleting the parent of a one-to-many relationship clears the relationship", function() {
  var parent, child;

  store.load(Comment, { id: 1, body: "Parent" });
  store.load(Comment, { id: 2, body: "Child" });

  parent = store.find(Comment, 1);
  child = store.find(Comment, 2);

  equal(child.get('comment'), null, "the child should not yet belong to anyone");

  parent.get('comments').addObject(child);

  equal(child.get('comment'), parent, "the child should now belong to the parent");

  parent.deleteRecord();

  equal(child.get('comment'), null, "the child should no longer belong to anyone");
});

test("deleting the child of a one-to-many relationship clears the relationship", function() {
  var parent, child;

  store.load(Comment, { id: 1, body: "Parent" });
  store.load(Comment, { id: 2, body: "Child" });

  parent = store.find(Comment, 1);
  child = store.find(Comment, 2);

  deepEqual(parent.get('comments').toArray(), [], "the parent should not yet have any children");

  child.set('comment', parent);

  deepEqual(parent.get('comments').toArray(), [ child ], "the parent should now have the child");

  child.deleteRecord();

  deepEqual(parent.get('comments').toArray(), [], "the parent should no longer have any children");
});

test("deleting the parent of a one-to-one relationship clears the relationship", function() {
  var Attachment, parent, child;

  Attachment = DS.Model.extend({
    filename: DS.attr('string'),
    comment: DS.belongsTo(Comment)
  });

  Comment.reopen({
    attachment: DS.hasOne(Attachment)
  });

  store.load(Comment, { id: 1, body: "Parent" });
  store.load(Attachment, { id: 1, filename: "child.mp3" });

  parent = store.find(Comment, 1);
  child = store.find(Attachment, 1);

  equal(child.get('comment'), null, "the child should not yet belong to anyone");

  parent.set('attachment', child);

  equal(child.get('comment'), parent, "the child should now belong to the parent");

  parent.deleteRecord();

  equal(child.get('comment'), null, "the child should no longer belong to anyone");
});

test("deleting the child of a one-to-one relationship clears the relationship", function() {
  var Attachment, parent, child;

  Attachment = DS.Model.extend({
    filename: DS.attr('string'),
    comment: DS.belongsTo(Comment)
  });

  Comment.reopen({
    attachment: DS.hasOne(Attachment)
  });

  store.load(Comment, { id: 1, body: "Parent" });
  store.load(Attachment, { id: 1, filename: "child.mp3" });

  parent = store.find(Comment, 1);
  child = store.find(Attachment, 1);

  equal(parent.get('attachment'), null, "the parent should not yet have a child");

  child.set('comment', parent);

  equal(parent.get('attachment'), child, "the parent should now have the child");

  child.deleteRecord();

  equal(parent.get('attachment'), null, "the parent should no longer have a child");
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
