DS.HasManyLoader = function (store, record, relationship) {
  return function(array) {
    var json;

    if (array instanceof DS.ArrayProcessor) {
      json = array.array;
    } else {
      json = array;
    }

    var ids = json.map(function(obj) { return obj.id; });

    store.loadMany(relationship.type, json);
    store.loadHasMany(record, relationship.key, ids);
  };
};
