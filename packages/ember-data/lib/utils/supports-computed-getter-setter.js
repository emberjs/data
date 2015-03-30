var supportsComputedGetterSetter;

try {
  Ember.computed({
    get: function() { },
    set: function() { }
  });
  supportsComputedGetterSetter = true;
} catch(e) {
  supportsComputedGetterSetter = false;
}

export default supportsComputedGetterSetter;
