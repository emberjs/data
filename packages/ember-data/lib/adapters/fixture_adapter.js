require("ember-data/core");
require("ember-data/system/adapter");

/**
  @module ember-data
*/

var get = Ember.get, fmt = Ember.String.fmt,
    indexOf = Ember.EnumerableUtils.indexOf;

var counter = 0;

/**
  `DS.FixtureAdapter` is an adapter that loads records from memory.
  Its primarily used for development and testing. You can also use
  `DS.FixtureAdapter` while working on the API but are not ready to
  integrate yet. It is a fully functioning adapter. All CRUD methods
  are implemented. You can also implement query logic that a remote
  system would do. Its possible to do develop your entire application
  with `DS.FixtureAdapter`.

  @class FixtureAdapter
  @namespace DS
  @extends DS.Adapter
*/
DS.FixtureAdapter = DS.Adapter.extend({
  // by default, fixtures are already in normalized form
  serializer: null,

  simulateRemoteResponse: true,

  latency: 50,

  /**
    Implement this method in order to provide data associated with a type

    @method fixturesForType
    @param  type
  */
  fixturesForType: function(type) {
    if (type.FIXTURES) {
      var fixtures = Ember.A(type.FIXTURES);
      return fixtures.map(function(fixture){
        var fixtureIdType = typeof fixture.id;
        if(fixtureIdType !== "number" && fixtureIdType !== "string"){
          throw new Error(fmt('the id property must be defined as a number or string for fixture %@', [fixture]));
        }
        fixture.id = fixture.id + '';
        return fixture;
      });
    }
    return null;
  },

  /**
    Implement this method in order to query fixtures data

    @method queryFixtures
    @param  fixture
    @param  query
    @param  type
  */
  queryFixtures: function(fixtures, query, type) {
    Ember.assert('Not implemented: You must override the DS.FixtureAdapter::queryFixtures method to support querying the fixture store.');
  },

  /**
    @method updateFixtures
    @param  type
    @param  fixture
  */
  updateFixtures: function(type, fixture) {
    if(!type.FIXTURES) {
      type.FIXTURES = [];
    }

    var fixtures = type.FIXTURES;

    this.deleteLoadedFixture(type, fixture);

    fixtures.push(fixture);
  },

  /**
    Implement this method in order to provide provide json for CRUD methods

    @method mockJSON
    @param  type
    @param  record
  */
  mockJSON: function(store, type, record) {
    return store.serializerFor(type).serialize(record, { includeId: true });
  },

  /**
    @method generateIdForRecord
    @param  store
    @param  record
  */
  generateIdForRecord: function(store) {
    return "fixture-" + counter++;
  },

  /**
    @method find
    @param  store
    @param  type
    @param  id
  */
  find: function(store, type, id) {
    var fixtures = this.fixturesForType(type),
        fixture;

    Ember.assert("Unable to find fixtures for model type "+type.toString(), fixtures);

    if (fixtures) {
      fixture = Ember.A(fixtures).findProperty('id', id);
    }

    if (fixture) {
      return this.simulateRemoteCall(function() {
        return fixture;
      }, this);
    }
  },

  /**
    @method findMany
    @param  store
    @param  type
    @param  ids
  */
  findMany: function(store, type, ids) {
    var fixtures = this.fixturesForType(type);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), fixtures);

    if (fixtures) {
      fixtures = fixtures.filter(function(item) {
        return indexOf(ids, item.id) !== -1;
      });
    }

    if (fixtures) {
      return this.simulateRemoteCall(function() {
        return fixtures;
      }, this);
    }
  },

  /**
    @method findAll
    @param  store
    @param  type
  */
  findAll: function(store, type) {
    var fixtures = this.fixturesForType(type);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), fixtures);

    return this.simulateRemoteCall(function() {
      return fixtures;
    }, this);
  },

  /**
    @method findQuery
    @param  store
    @param  type
    @param  query
    @param  array
  */
  findQuery: function(store, type, query, array) {
    var fixtures = this.fixturesForType(type);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), fixtures);

    fixtures = this.queryFixtures(fixtures, query, type);

    if (fixtures) {
      return this.simulateRemoteCall(function() {
        return fixtures;
      }, this);
    }
  },

  /**
    @method createRecord
    @param  store
    @param  type
    @param  record
  */
  createRecord: function(store, type, record) {
    var fixture = this.mockJSON(store, type, record);

    this.updateFixtures(type, fixture);

    return this.simulateRemoteCall(function() {
      return fixture;
    }, this);
  },

  /**
    @method updateRecord
    @param  store
    @param  type
    @param  record
  */
  updateRecord: function(store, type, record) {
    var fixture = this.mockJSON(store, type, record);

    this.updateFixtures(type, fixture);

    return this.simulateRemoteCall(function() {
      return fixture;
    }, this);
  },

  /**
    @method deleteRecord
    @param  store
    @param  type
    @param  record
  */
  deleteRecord: function(store, type, record) {
    var fixture = this.mockJSON(store, type, record);

    this.deleteLoadedFixture(type, fixture);

    return this.simulateRemoteCall(function() {
      // no payload in a deletion
      return null;
    });
  },

  /*
    @method deleteLoadedFixture
    @private
    @param type
    @param record
  */
  deleteLoadedFixture: function(type, record) {
    var existingFixture = this.findExistingFixture(type, record);

    if(existingFixture) {
      var index = indexOf(type.FIXTURES, existingFixture);
      type.FIXTURES.splice(index, 1);
      return true;
    }
  },

  /*
    @method findExistingFixture
    @private
    @param type
    @param record
  */
  findExistingFixture: function(type, record) {
    var fixtures = this.fixturesForType(type);
    var id = get(record, 'id');

    return this.findFixtureById(fixtures, id);
  },

  /*
    @method findFixtureById
    @private
    @param type
    @param record
  */
  findFixtureById: function(fixtures, id) {
    return Ember.A(fixtures).find(function(r) {
      if(''+get(r, 'id') === ''+id) {
        return true;
      } else {
        return false;
      }
    });
  },

  /*
    @method simulateRemoteCall
    @private
    @param callback
    @param context
  */
  simulateRemoteCall: function(callback, context) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve) {
      if (get(adapter, 'simulateRemoteResponse')) {
        // Schedule with setTimeout
        Ember.run.later(function() {
          resolve(callback.call(context));
        }, get(adapter, 'latency'));
      } else {
        // Asynchronous, but at the of the runloop with zero latency
        Ember.run.once(function() {
          resolve(callback.call(context));
        });
      }
    });
  }
});
