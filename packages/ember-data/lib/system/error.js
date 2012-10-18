DS.Error = Ember.Object.extend({
  message: null
});

DS.ValidationError = DS.Error.extend({
  attribute: null,
});

DS.AdapterValidationError = DS.ValidationError.extend();

DS.AdapterError = DS.Error.extend({
  isFatal: false
});
