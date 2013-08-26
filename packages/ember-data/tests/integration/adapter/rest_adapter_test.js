var env, store, adapter, Post, Person, Comment;
var originalAjax, passedUrl, passedVerb, passedHash;

module("integration/adapter/rest_adapter - REST Adapter", {
  setup: function() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

    Post.toString = function() {
      return "Post";
    };

    Comment = DS.Model.extend({
      name: DS.attr("string")
    });

    env = setupStore({
      post: Post,
      comment: Comment,
      adapter: DS.RESTAdapter
    });

    store = env.store;
    adapter = env.adapter;

    passedUrl = passedVerb = passedHash = null;
  }
});

function ajaxResponse(value) {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return Ember.RSVP.resolve(value);
  };
}

test("find - basic payload", function() {
  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - payload with sideloaded records of the same type", function() {
  var count = 0;

  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }, { id: 2, name: "The Parley Letter" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var post2 = store.getById('post', 2);
    equal(post2.get('id'), "2");
    equal(post2.get('name'), "The Parley Letter");
  }));
});

test("find - payload with sideloaded records of a different type", function() {
  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }], comments: [{ id: 1, name: "FIRST" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var comment = store.getById('comment', 1);
    equal(comment.get('id'), "1");
    equal(comment.get('name'), "FIRST");
  }));
});

test("find - payload with an serializer-specified primary key", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_'
  }));

  ajaxResponse({ posts: [{ "_ID_": 1, name: "Rails is omakase" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - payload with a serializer-specified attribute mapping", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      'name': '_NAME_'
    }
  }));

  ajaxResponse({ posts: [{ id: 1, _NAME_: "Rails is omakase" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("create - an empty payload is a basic success if an id was specified", function() {
  ajaxResponse();

  var post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { id: "some-uuid", name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "The Parley Letter", "the post was updated");
  }));
});

test("create - a payload with a new ID and data applies the updates", function() {
  ajaxResponse({ posts: [{ id: "1", name: "Dat Parley Letter" }] });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with sideloaded updates pushes the updates", function() {
  ajaxResponse({ posts: [{ id: 1, name: "Dat Parley Letter" }], comments: [{ id: 1, name: "FIRST" }] });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

test("update - an empty payload is a basic success", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse();

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "The Parley Letter", "the post was updated");
  }));
});

test("update - a payload with updates applies the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ posts: [{ id: 1, name: "Dat Parley Letter" }] });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with sideloaded updates pushes the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ posts: [{ id: 1, name: "Dat Parley Letter" }], comments: [{ id: 1, name: "FIRST" }] });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

test("delete - an empty payload is a basic success", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse();

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");
  }));
});

test("delete - a payload with sideloaded updates pushes the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1, name: "FIRST" }] });

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

//test("creating a record with a 422 error marks the records as invalid", function(){
  //expect(1);

  //var mockXHR = {
    //status:       422,
    //responseText: JSON.stringify({ errors: { name: ["can't be blank"]} })
  //};

  //jQuery.ajax = function(hash) {
    //hash.error.call(hash.context, mockXHR, "Unprocessable Entity");
  //};

  //var post = store.createRecord(Post, { name: "" });

  //post.on("becameInvalid", function() {
    //ok(true, "becameInvalid is called");
  //});

  //post.on("becameError", function() {
    //ok(false, "becameError is not called");
  //});

  //post.save();
//});

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
