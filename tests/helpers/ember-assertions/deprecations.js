import Ember from 'ember';

const deprecations = {
  NONE: 99, // 99 problems and a deprecation ain't one
  expecteds: null,
  actuals: null,
  stubEmber: function() {
    if (!deprecations.originalEmberDeprecate && Ember.deprecate !== deprecations.originalEmberDeprecate) {
      deprecations.originalEmberDeprecate = Ember.deprecate;
    }
    Ember.deprecate = function(msg, test) {
      deprecations.actuals = deprecations.actuals || [];
      deprecations.actuals.push([msg, test]);
    };
  },
  restoreEmber: function() {
    Ember.deprecate = deprecations.originalEmberDeprecate;
  }
};

export default deprecations;
