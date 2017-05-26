import DS from 'ember-data';

export default DS.JSONAPISerializer.extend({
  normalizeResponse(store, modelClass, payload, id, requestType) {
    return payload;
  }
});
