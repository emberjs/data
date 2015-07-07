export function serializerForAdapter(store, adapter, type) {
  var serializer = adapter.serializer;

  if (serializer === undefined) {
    serializer = store.serializerFor(type);
  }

  if (serializer === null || serializer === undefined) {
    Ember.deprecate('Ember Data 2.0 will no longer support adapters with a null serializer property. Please define `defaultSerializer: "-default"` your adapter and make sure the `serializer` property is not null.');
    serializer = {
      extract: function(store, type, payload) { return payload; }
    };
  }

  return serializer;
}
