var env, store;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

module("unit/many_array - DS.ManyArray", {
  setup: function() {
    var Post = DS.Model.extend({
      title: attr('string'),
      tags: hasMany('tag')
    });
    Post.toString = function() {
      return 'Post';
    };

    var Tag = DS.Model.extend({
      name: attr('string'),
      post: belongsTo('post')
    });
    Tag.toString = function() {
      return 'Tag';
    };

    env = setupStore({
      post: Post,
      tag: Tag
    });
    store = env.store;
  },

  teardown: function() {
    run(function() {
      store.destroy();
    });
  }
});

test("manyArray.addRecord() has been deprecated", function() {
  expect(3);

  run(function() {
    var tag = store.push('tag', { id: 1, name: 'Ember.js' });
    var post = store.push('post', { id: 2, title: 'A framework for creating ambitious web applications' });
    var tags = post.get('tags');

    equal(tags.length, 0, 'there should not be any tags');
    expectDeprecation(function() {
      tags.addRecord(tag);
    });
    equal(tags.length, 1, 'there should be 1 tag');
  });
});

test("manyArray.removeRecord() has been deprecated", function() {
  expect(3);
  run(function() {
    var tag = store.push('tag', { id: 1, name: 'Ember.js' });
    var post = store.push('post', { id: 2, title: 'A framework for creating ambitious web applications', tags: [1] });
    var tags = post.get('tags');

    equal(tags.length, 1, 'there should be 1 tag');
    expectDeprecation(function() {
      tags.removeRecord(tag);
    });
    equal(tags.length, 0, 'there should not be any tags');
  });
});
