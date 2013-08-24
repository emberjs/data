Ember.String.pluralize = function(word) {
  return Ember.Inflector.inflector.pluralize(word);
};

Ember.String.singularize = function(word) {
  return Ember.Inflector.inflector.singularize(word);
};
