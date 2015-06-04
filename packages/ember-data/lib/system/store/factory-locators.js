import normalizeModelName from 'ember-data/system/normalize-model-name';

function modelFor(container, modelName) {
  var factory = modelFactoryFor(container, modelName);

  if (!factory) {
    //Support looking up mixins as base types for polymorphic relationships
    factory = modelForMixin(container, modelName);
  }
  if (!factory) {
    throw new Ember.Error("No model was found for '" + modelName + "'");
  }
  factory.modelName = factory.modelName || normalizeModelName(modelName);
  factory.__container__ = factory.__container__ || container;

  // deprecate typeKey
  if (!('typeKey' in factory)) {
    Ember.defineProperty(factory, 'typeKey', {
      enumerable: true,
      configurable: false,
      get: function() {
        Ember.deprecate('Usage of `typeKey` has been deprecated and will be removed in Ember Data 1.0. It has been replaced by `modelName` on the model class.');
        return Ember.String.camelize(this.modelName);
      },
      set: function() {
        Ember.assert('Setting typeKey is not supported. In addition, typeKey has also been deprecated in favor of modelName. Setting modelName is also not supported.');
      }
    });
  }

  return factory;
}

function modelFactoryFor(container, modelName) {
  var normalizedKey = normalizeModelName(modelName);
  return container.lookupFactory('model:' + normalizedKey);
}

/*
  In case someone defined a relationship to a mixin, for example:
  ```
    var Comment = DS.Model.extend({
      owner: belongsTo('commentable'. { polymorphic: true})
    });
    var Commentable = Ember.Mixin.create({
      comments: hasMany('comment')
    });
  ```
  we want to look up a Commentable class which has all the necessary
  relationship metadata. Thus, we look up the mixin and create a mock
  DS.Model, so we can access the relationship CPs of the mixin (`comments`)
  in this case
*/
function modelForMixin(container, modelName) {
  var normalizedModelName = normalizeModelName(modelName);
  var registry = container._registry ? container._registry : container;
  var mixin = registry.resolve('mixin:' + normalizedModelName);
  if (mixin) {
    //Cache the class as a model
    registry.register('model:' + normalizedModelName, DS.Model.extend(mixin));
  }
  var factory = modelFactoryFor(container, normalizedModelName);
  if (factory) {
    factory.__isMixin = true;
    factory.__mixin = mixin;
  }

  return factory;
}

export {
  modelFor,
  modelFactoryFor
};
