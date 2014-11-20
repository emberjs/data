var get = Ember.get;
var Post, Comment, Misc, env;

module("integration/client_id_generation - Client-side ID Generation", {
  setup: function() {
    Comment = DS.Model.extend({
      post: DS.belongsTo('post')
    });

    Post = DS.Model.extend({
      comments: DS.hasMany('comment')
    });

    Misc = DS.Model.extend({
      foo: DS.attr('string')
    });

    env = setupStore({
      post: Post,
      comment: Comment,
      misc: Misc
    });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("If an adapter implements the `generateIdForRecord` method, the store should be able to assign IDs without saving to the persistence layer.", function() {
  expect(6);

  var idCount = 1;

  env.adapter.generateIdForRecord = function(passedStore, record) {
    equal(env.store, passedStore, "store is the first parameter");

    return "id-" + idCount++;
  };

  env.adapter.createRecord = function(store, type, record) {
    if (type === Comment) {
      equal(get(record, 'id'), 'id-1', "Comment passed to `createRecord` has 'id-1' assigned");
      return Ember.RSVP.resolve();
    } else {
      equal(get(record, 'id'), 'id-2', "Post passed to `createRecord` has 'id-2' assigned");
      return Ember.RSVP.resolve();
    }
  };

  var comment = env.store.createRecord('comment');
  var post = env.store.createRecord('post');

  equal(get(comment, 'id'), 'id-1', "comment is assigned id 'id-1'");
  equal(get(post, 'id'), 'id-2', "post is assigned id 'id-2'");

  // Despite client-generated IDs, calling commit() on the store should still
  // invoke the adapter's `createRecord` method.
  comment.save();
  post.save();
});
test("empty string and undefined ids should coerce to null", function() {
  expect(6);
  var idCount = 0;
  var ids = [undefined, ''];
  env.adapter.generateIdForRecord = function(passedStore, record) {
    equal(env.store, passedStore, "store is the first parameter");

    return ids[idCount++];
  };

  env.adapter.createRecord = function(store, type, record) {
    equal(typeof get(record, 'id'), 'object', 'correct type');
    return Ember.RSVP.resolve();
  };

  var comment = env.store.createRecord('misc');
  var post = env.store.createRecord('misc');

  equal(get(comment, 'id'), null, "comment is assigned id 'null'");
  equal(get(post, 'id'), null, "post is assigned id 'null'");

  // Despite client-generated IDs, calling commit() on the store should still
  // invoke the adapter's `createRecord` method.
  comment.save();
  post.save();
});
