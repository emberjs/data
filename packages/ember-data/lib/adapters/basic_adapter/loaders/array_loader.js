DS.ArrayLoader = function(store, type, queryArray) {
  return function(array) {
    var json;

    if (array instanceof DS.ArrayProcessor) {
      json = array.array;
    } else {
      json = array;
    }

    if (queryArray) {
      var references = json.map(function(object) {
        return store.load(type, object);
      });

      queryArray.load(references);
    } else {
      store.loadMany(type, json);
    }
  };
};
