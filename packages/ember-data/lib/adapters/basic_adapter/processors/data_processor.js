var normalizer = requireModule('json-normalizer'),
    Processor = normalizer.Processor;

function DataProcessor() {
  Processor.apply(this, arguments);
}

DataProcessor.prototype = Ember.create(Processor.prototype);

Ember.merge(DataProcessor.prototype, {
  munge: function(callback, binding) {
    callback.call(binding, this.json);
    return this;
  },

  applyTransforms: Ember.K
});

DS.DataProcessor = DataProcessor;
