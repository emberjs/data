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
    run(function(){
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
  expect(4);

  deepEqual(store.metadataFor('post'), {}, 'metadata for post is initially empty');

  store.setMetadataFor('post', { foo: 'bar' });

  deepEqual(store.metadataFor('post'), { foo: 'bar' }, 'metadata for post contains foo:bar');

  store.setMetadataFor('post', { hello: 'world' });

  deepEqual(store.metadataFor('post'), { foo: 'bar', hello: 'world' }, 'metadata for post contains both foo:bar and hello:world');
  deepEqual(store.metadataFor('comment'), {}, 'metadata for comment is empty');
});