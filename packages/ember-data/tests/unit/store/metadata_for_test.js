var store;

var run = Ember.run;

module("unit/store/metadata_for - DS.Store#metadataFor", {
  setup: function() {
    store = createStore({
      post: DS.Model.extend(),
      comment: DS.Model.extend()
    });
  },

  teardown: function() {
    run(function() {
      store.destroy();
    });
  }
});

test("metaForType should be deprecated", function() {
  expect(1);

  expectDeprecation(function() {
    store.metaForType('post', { foo: 'bar' });
  });
});

test("metadataFor and setMetadataFor should return and set correct metadata", function() {
  expect(7);

  function metadataKeys(type) {
    return Ember.keys(store.metadataFor(type));
  }

  // Currently not using QUnit.deepEqual due to the way deepEqual
  // comparing __proto__. In its check to see if an object has
  // no proto, it checks strict equality on null instead of null or undefined.

  deepEqual(metadataKeys('post'), [], 'Metadata for post is initially empty');

  store.setMetadataFor('post', { foo: 'bar' });

  deepEqual(metadataKeys('post'), ['foo'], 'metadata for post contains foo:bar');
  equal(store.metadataFor('post').foo, 'bar');

  store.setMetadataFor('post', { hello: 'world' });

  deepEqual(metadataKeys('post'), ['foo', 'hello']);
  equal(store.metadataFor('post').foo, 'bar', 'keeps original metadata');
  equal(store.metadataFor('post').hello, 'world', 'merges new metadata');

  deepEqual(metadataKeys('comment'), [], 'metadata for comment is empty');
});
