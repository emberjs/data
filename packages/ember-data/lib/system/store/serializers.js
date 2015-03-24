/*globals Ember*/

export function serializerForAdapter(store, adapter, type) {
  var serializer = Ember.get(adapter, 'serializer');

  if (serializer === undefined) {
    serializer = store.serializerFor(type);
  }

  if (serializer === null || serializer === undefined) {
    serializer = {
      extract: function(store, type, payload) { return payload; }
    };
  }

  return serializer;
}
