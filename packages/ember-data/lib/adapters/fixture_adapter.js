require("ember-data/core");
require("ember-data/system/adapter");
require('ember-data/serializers/fixture_serializer');

var get = Ember.get;

DS.FixtureAdapter = DS.Adapter.extend({

  simulateRemoteResponse: true,

  latency: 50,

  serializer: DS.FixtureSerializer,

  /*
    Implement this method in order to provide data associated with a type
  */
  fixturesForType: function(type) {
    if (type.FIXTURES) {
      var fixtures = Ember.A(type.FIXTURES);
      return fixtures.map(function(fixture){
        if(!fixture.id){
          throw new Error('the id property must be defined for fixture %@'.fmt(fixture));
        }
        fixture.id = fixture.id + '';
        return fixture;
      });
    }
    return null;
  },

  /*
    Implement this method in order to query fixtures data
  */
  queryFixtures: function(fixtures, query, type) {
    return fixtures;
  },

  /*
    Implement this method in order to provide provide json for CRUD methods
  */
  mockJSON: function(type, record) {
    return this.serialize(record, { includeId: true });
  },

  /*
    Adapter methods
  */
  generateIdForRecord: function(store, record) {
    return Ember.guidFor(record);
  },

  find: function(store, type, id) {
    var fixtures = this.fixturesForType(type),
        fixture;

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    if (fixtures) {
      fixture = Ember.A(fixtures).findProperty('id', id);
    }

    if (fixture) {
      this.simulateRemoteCall(function() {
        this.didFindRecord(store, type, fixture, id);
      }, this);
    }
  },

  findMany: function(store, type, ids) {
    var fixtures = this.fixturesForType(type);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    if (fixtures) {
      fixtures = fixtures.filter(function(item) {
        return ids.indexOf(item.id) !== -1;
      });
    }

    if (fixtures) {
      this.simulateRemoteCall(function() {
        this.didFindMany(store, type, fixtures);
      }, this);
    }
  },

  findAll: function(store, type) {
    var fixtures = this.fixturesForType(type);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    this.simulateRemoteCall(function() {
      this.didFindAll(store, type, fixtures);
    }, this);
  },

  findQuery: function(store, type, query, array) {
    var fixtures = this.fixturesForType(type);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    fixtures = this.queryFixtures(fixtures, query, type);

    if (fixtures) {
      this.simulateRemoteCall(function() {
        this.didFindQuery(store, type, fixtures, array);
      }, this);
    }
  },

  createRecord: function(store, type, record) {
    var fixture = this.mockJSON(type, record);

    fixture.id = this.generateIdForRecord(store, record);

    this.simulateRemoteCall(function() {
      this.didCreateRecord(store, type, record, fixture);
    }, this);
  },

  updateRecord: function(store, type, record) {
    var fixture = this.mockJSON(type, record);

    this.simulateRemoteCall(function() {
      this.didUpdateRecord(store, type, record, fixture);
    }, this);
  },

  deleteRecord: function(store, type, record) {
    this.simulateRemoteCall(function() {
      this.didDeleteRecord(store, type, record);
    }, this);
  },

  /*
    @private
  */
  simulateRemoteCall: function(callback, context) {
    function response() {
      Ember.run(context, callback);
    }

    if (get(this, 'simulateRemoteResponse')) {
      setTimeout(response, get(this, 'latency'));
    } else {
      response();
    }
  }
});
