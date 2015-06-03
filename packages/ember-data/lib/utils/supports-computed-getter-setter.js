var supportsComputedGetterSetter;

try {
  Ember.computed({
    get() { },
    set() { }
  });
  supportsComputedGetterSetter = true;
} catch(e) {
  supportsComputedGetterSetter = false;
}

export default supportsComputedGetterSetter;
