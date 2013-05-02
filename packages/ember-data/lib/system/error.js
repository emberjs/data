DS.Error = Ember.Object.extend({
  record: null,
  message: null
});

DS.ValidationError = DS.Error.extend({
  attributeName: null,
});

DS.AdapterValidationError = DS.ValidationError.extend();
DS.AdapterError = DS.Error.extend();
