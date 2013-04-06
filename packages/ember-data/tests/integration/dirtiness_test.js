var store, adapter;
var Person;

module("Attribute Changes and Dirtiness", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });

    Person = DS.Model.extend({
      firstName: DS.attr('string')
    });
  }

});

test("By default, if a record's attribute is changed, it becomes dirty", function() {
  store.load(Person, { id: 1, firstName: "Yehuda" });
  var wycats = store.find(Person, 1);

  wycats.set('firstName', "Brohuda");

  ok(wycats.get('isDirty'), "record has become dirty");
});

test("By default, a newly created record is dirty", function() {
  var wycats = store.createRecord(Person);

  ok(wycats.get('isDirty'), "record is dirty");
});

test("By default, changing the relationship between two records does not cause them to become dirty", function() {
  adapter.dirtyRecordsForHasManyChange = Ember.K;
  adapter.dirtyRecordsForBelongsToChange = Ember.K;

  var Post = DS.Model.extend();

  var Comment = DS.Model.extend({
    post: DS.belongsTo(Post)
  });

  Post.reopen({
    comments: DS.hasMany(Comment)
  });

  store.load(Post, { id: 1, comments: [1] });
  store.load(Comment, { id: 1, post: 1 });

  var post = store.find(Post, 1);
  var comment = store.find(Comment, 1);

  comment.set('post', null);

  ok(!post.get('isDirty'), "post should not be dirty");
  ok(!comment.get('isDirty'), "comment should not be dirty");
});

test("If dirtyRecordsForAttributeChange does not add the record to the dirtyRecords set, it does not become dirty", function() {
  store.load(Person, { id: 1, firstName: "Yehuda" });
  var wycats = store.find(Person, 1);

  adapter.dirtyRecordsForAttributeChange = function(dirtyRecords, changedRecord, attributeName) {
    equal(changedRecord, wycats, "changed record is passed to hook");
    equal(attributeName, "firstName", "attribute name is passed to hook");
  };

  wycats.set('firstName', "Brohuda");

  ok(!wycats.get('isDirty'), "the record is not dirty despite attribute change");
});

test("If dirtyRecordsForAttributeChange adds the record to the dirtyRecords set, it becomes dirty", function() {
  store.load(Person, { id: 1, firstName: "Yehuda" });
  var wycats = store.find(Person, 1);

  adapter.dirtyRecordsForAttributeChange = function(dirtyRecords, changedRecord, attributeName) {
    equal(changedRecord, wycats, "changed record is passed to hook");
    equal(attributeName, "firstName", "attribute name is passed to hook");
    dirtyRecords.add(changedRecord);
  };

  wycats.set('firstName', "Brohuda");

  ok(wycats.get('isDirty'), "the record is dirty after attribute change");
});

test("If dirtyRecordsForAttributeChange adds a different record than the changed record to the dirtyRecords set, the different record becomes dirty", function() {
  store.load(Person, { id: 1, firstName: "Yehuda" });
  store.load(Person, { id: 2, firstName: "Tom" });
  var wycats = store.find(Person, 1);
  var tomdale = store.find(Person, 2);

  adapter.dirtyRecordsForAttributeChange = function(dirtyRecords, changedRecord, attributeName) {
    equal(changedRecord, wycats, "changed record is passed to hook");
    equal(attributeName, "firstName", "attribute name is passed to hook");
    dirtyRecords.add(tomdale);
  };

  wycats.set('firstName', "Brohuda");

  ok(tomdale.get('isDirty'), "the record is dirty after attribute change");
  ok(!wycats.get('isDirty'), "the record is not dirty after attribute change");
});

test("If dirtyRecordsForAttributeChange adds two records to the dirtyRecords set, both become dirty", function() {
  store.load(Person, { id: 1, firstName: "Yehuda" });
  store.load(Person, { id: 2, firstName: "Tom" });
  var wycats = store.find(Person, 1);
  var tomdale = store.find(Person, 2);

  adapter.dirtyRecordsForAttributeChange = function(dirtyRecords, changedRecord, attributeName) {
    equal(changedRecord, wycats, "changed record is passed to hook");
    equal(attributeName, "firstName", "attribute name is passed to hook");
    dirtyRecords.add(tomdale);
    dirtyRecords.add(wycats);
  };

  wycats.set('firstName', "Brohuda");

  ok(tomdale.get('isDirty'), "the record is dirty after attribute change");
  ok(wycats.get('isDirty'), "the record is dirty after attribute change");
});

test("When adding a newly created record to a hasMany relationship, the parent should become clean after committing", function() {
  var App = Ember.Namespace.create();
  App.toString = function() { return "App"; };

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  });

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.belongsTo(App.Post)
  });

  App.Post.reopen({
    comments: DS.hasMany(App.Comment)
  });

  expect(3);

  adapter.dirtyRecordsForHasManyChange = Ember.K;

  function didSaveRecord(store, record, hash) {
    record.eachRelationship(function(name, relationship) {
      if (relationship.kind === 'belongsTo') {
        store.didUpdateRelationship(record, name);
      }
    });

    store.didSaveRecord(record, hash);
  }

  adapter.createRecord = function(store, type, record) {
    didSaveRecord(store, record, this.serialize(record));
  };

  store.load(App.Post, { id: 1});
  var post = store.find(App.Post, 1);

  post.get('comments').createRecord();

  equal(post.get('isDirty'), false, "precond - the record should be dirty");

  store.commit();

  equal(post.get('isDirty'), false, "The record should no longer be dirty");
  equal(post.get('isSaving'), false, "The record should no longer be saving");
});

var App;

module("Attribute notDirty", {
  setup: function() {
    App = Ember.Namespace.create({name: 'App'});

    App.Person = DS.Model.extend({
      firstName: DS.attr('string')
    });
    App.Post = DS.Model.extend({
      title: DS.attr('string')
    });
    App.Comment = DS.Model.extend({
      title: DS.attr('string'),
      post: DS.belongsTo(App.Post)
    });
    App.Post.reopen({
      comments: DS.hasMany(App.Comment)
    });

    var Adapter = DS.Adapter.extend();
    Adapter.map(App.Person, {
      firstName: { notDirty: true }
    });
    Adapter.map(App.Comment, {
      post: { notDirty: true }
    });
    Adapter.map(App.Post, {
      comments: { notDirty: true }
    });

    store = DS.Store.create({
      adapter: Adapter.create()
    });
  },

  teardown: function() {
    App.destroy();
  }

});

test("By default, if a notDirty attribute is changed, the record does not become dirty", function() {
  store.load(App.Person, { id: 1, firstName: "Yehuda" });
  var wycats = store.find(App.Person, 1);

  wycats.set('firstName', "Brohuda");

  ok(!wycats.get('isDirty'), "record hasn't become dirty");
});

test("If a notDirty attribute is changed, the record can be reloaded/updated with new data", function() {
  store.load(App.Person, { id: 1, firstName: "Yehuda" });
  var wycats = store.find(App.Person, 1);

  wycats.set('firstName', "Brohuda");
  equal( wycats.get('firstName'), "Brohuda", "record attribute value get updated");

  store.load(App.Person, { id: 1, firstName: "Tiohuda" });
  equal( wycats.get('firstName'), "Tiohuda", "record can be reloaded after updating a notDirty attribute");
});

test("If a notDirty belongsTo property changed, the record does not become dirty", function() {
  store.load(App.Post, { id: 1, title: "Post 1"});
  store.load(App.Post, { id: 2, title: "Post 2"});
  var post1 = store.find(App.Post, 1);
  var post2 = store.find(App.Post, 2);

  store.load(App.Comment, { id: 1, title: "Comment 1", post: post1 });
  var comment = store.find(App.Comment, 1);

  ok( !comment.get('isDirty'), "created record is not dirty");
  comment.set('post', post2);

  ok( !comment.get('isDirty'), "record is not dirty after updating a NotDirty belongsTo property");
});

test("If a notDirty hasMany changed, the record does not become dirty", function() {
  store.load(App.Comment, { id: 1, title: "Comment 1"});
  store.load(App.Comment, { id: 2, title: "Comment 2"});
  var comment1 = store.find(App.Comment, 1);
  var comment2 = store.find(App.Comment, 2);

  store.load(App.Post, { id: 1, title: "Post 1", comments: [comment1] });
  var post = store.find(App.Post, 1);

  ok( !post.get('isDirty'), "created record is not dirty");
  post.get('comments').pushObject(comment2);

  ok( !post.get('isDirty'), "record is not dirty after updating a NotDirty hasMany property");
});
