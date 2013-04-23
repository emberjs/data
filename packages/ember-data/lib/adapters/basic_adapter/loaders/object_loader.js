DS.ObjectLoader = function(store, type) {
  return function(object) {
    var json;

    if (object instanceof DS.DataProcessor) {
      json = object.json;
    } else {
      json = object;
    }

    store.load(type, json);
  };
};
