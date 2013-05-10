var get = Ember.get, set = Ember.set;

var store, Adapter, adapter;
var Post, Comment, User, App;
var attr = DS.attr;
var idCounter;
var expectedEvents;

module("Embedded Lifecycle", {
  setup: function() {
    App = Ember.Namespace.create({ name: "App" });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string')
    });

    Post = App.Post = DS.Model.extend({
      title: attr('string'),
      comments: DS.hasMany(Comment)
    });

    Comment.reopen({
      post: DS.belongsTo(Post)
    });

    Adapter = DS.RESTAdapter.extend();

    Adapter.map(Post, {
      comments: { embedded: 'always' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });

    idCounter = 1;

    expectedEvents = Ember.A([]);
  },

  teardown: function() {
    store.destroy();
    App.destroy();
    idCounter = undefined;
    expectedEvents = undefined;
  }
});

function expectEvent(obj, event) {
  var entry = [obj, event];
  expectedEvents.push(entry);
  obj.one(event, function() {
    expectedEvents.removeObject(entry);
  });
}

function checkEvents() {
  expectedEvents.forEach(function(entry) {
    ok(false, "expected '" + entry[1] + "' to be fired on " + entry[0]);
  });
}

function dataForRequest(record, props) {
  props = props || {};
  var root = adapter.rootForType(record.constructor);
  var data = adapter.serialize(record, { includeId: true });
  Ember.merge(data, props);
  var result = {};
  result[root] = data;
  return result;
}

function dataForCreate(record, props) {
  props = props || {};
  Ember.merge(props, {id: idCounter++});
  return dataForRequest(record, props);
}

asyncTest("Modifying the parent in a different transaction", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts/1');
    equal(type, 'PUT');
    equal(hash.data.post.comments.length, 1);

    return new Ember.RSVP.Promise(function(resolve, reject){
      Ember.run.later(function(){
        start();
        resolve(hash.data);
      },0);
    });
  };

  adapter.load(store, Post, {
    id: 1,
    title: 'I cannot wait for Ember.Component to be implemented.',
    comments: [{id: 2, title: 'yes!'}]
  });

  var post = store.find(Post, 1);

  var t = store.transaction();
  t.add(post);

  set(post, 'title', "Hopefully soon.");

  t.commit();
});

asyncTest("create parent -> child", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts');
    equal(type, 'POST');
    equal(hash.data.post.comments.length, 1);

    return new Ember.RSVP.Promise(function(resolve, reject){
      Ember.run.later(function(){
        var data = dataForCreate(post);
        data.post.comments[0] = dataForCreate(comment);
        resolve(hash.data);
        Ember.run.later(function() {
          deepEqual(post.get('comments').toArray(), [comment]);
          checkEvents();
          start();
        }, 0);
      },0);
    });
  };

  var post = store.createRecord(Post, {
    title: 'This post is unsaved'
  });

  var comment = post.get('comments').createRecord({ title: 'This embedded record is also unsaved' });

  expectEvent(post, 'didCreate');
  expectEvent(comment, 'didCreate');

  store.commit();
});

asyncTest("existing parent -> create child", function() {
  adapter.ajax = function(url, type, hash) {
    equal(url, '/posts/1');
    equal(type, 'PUT');
    equal(hash.data.post.comments.length, 1);

    return new Ember.RSVP.Promise(function(resolve, reject){
      Ember.run.later(function(){
        var data = dataForRequest(post);
        data.post.comments[0] = dataForCreate(comment);
        resolve(hash.data);
        Ember.run.later(function() {
          deepEqual(post.get('comments').toArray(), [comment]);
          checkEvents();
          start();
        }, 0);
      },0);
    });
  };

  store.load(Post, {
    id: 1,
    title: 'This post is unsaved'
  });

  var post = store.find(Post, 1);

  var comment = post.get('comments').createRecord({ title: 'This embedded record is also unsaved' });

  expectEvent(post, 'didUpdate');
  expectEvent(comment, 'didCreate');

  store.commit();
});
