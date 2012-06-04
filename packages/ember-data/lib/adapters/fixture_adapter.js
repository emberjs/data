require("ember-data/core");
require("ember-data/system/adapters");

DS.fixtureAdapter = DS.Adapter.create({
  find: function(store, type, id, record) {
    var fixtures = type.FIXTURES;

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);
    if (fixtures.hasLoaded) { return; }

    setTimeout(function() {
      store.loadMany(type, fixtures);
      fixtures.hasLoaded = true;
    }, 300);
  },

  findMany: function(store, type, ids, recordArray) {
    var fixtures = type.FIXTURES;

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    fixtures = fixtures.map(function(hash) {
      return ids.indexOf(hash.id) !== -1;
    });

    setTimeout(function() {
      recordArray.load(fixtures);
      fixtures.hasLoaded = true;
    }, 300);
  },

  findAll: function(store, type, recordArray) {
    var fixtures = type.FIXTURES;

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    recordArray.load(fixtures);
  }

});
