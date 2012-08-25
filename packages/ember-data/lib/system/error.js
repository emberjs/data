DS.Error = Ember.Object.extend({
  message: null
});

DS.ValidationError = DS.Error.extend({
  attribute: null,
});

DS.ClientValidationError = DS.ValidationError.extend();
DS.ServerValidationError = DS.ValidationError.extend();

DS.ServerError = DS.Error.extend({
  code: null,
  isFatal: false
});
