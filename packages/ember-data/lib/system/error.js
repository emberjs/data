DS.Error = Ember.Object.extend({
  thrown: null
});

DS.NotFoundError = DS.Error.extend();
DS.AdapterError = DS.Error.extend();
DS.AdapterTimeoutError = DS.AdapterError.extend();
