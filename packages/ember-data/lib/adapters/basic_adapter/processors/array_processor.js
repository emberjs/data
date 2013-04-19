var normalizer = requireModule('json-normalizer'),
    camelizeKeys = normalizer.camelizeKeys;

function ArrayProcessor(array) {
  this.array = array;
}

ArrayProcessor.prototype = {
  constructor: ArrayProcessor,

  camelizeKeys: function() {
    var array = this.array;
    for (var i=0, l=array.length; i<l; i++) {
      array[i] = camelizeKeys(array[i]);
    }

    return this;
  },

  munge: function(callback, binding) {
    var array = this.array;
    for (var i=0, l=array.length; i<l; i++) {
      callback.call(binding, array[i]);
    }

    return this;
  }
};

DS.ArrayProcessor = ArrayProcessor;
