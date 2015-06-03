/**
  @module ember-data
*/
var get = Ember.get;
var fmt = Ember.String.fmt;
var indexOf = Ember.EnumerableUtils.indexOf;

var counter = 0;

import Adapter from "ember-data/system/adapter";

/**
  `DS.FixtureAdapter` is an adapter that loads records from memory.
  It's primarily used for development and testing. You can also use
  `DS.FixtureAdapter` while working on the API but is not ready to
  integrate yet. It is a fully functioning adapter. All CRUD methods
  are implemented. You can also implement query logic that a remote
  system would do. It's possible to develop your entire application
  with `DS.FixtureAdapter`.

  For information on how to use the `FixtureAdapter` in your
  application please see the [FixtureAdapter
  guide](/guides/models/the-fixture-adapter/).

  @class FixtureAdapter
  @namespace DS
  @extends DS.Adapter
*/
export default Adapter.extend({
  // by default, fixtures are already in normalized form
  serializer: null,
  // The fixture adapter does not support coalesceFindRequests
  coalesceFindRequests: false,

  /**
    If `simulateRemoteResponse` is `true` the `FixtureAdapter` will
    wait a number of milliseconds before resolving promises with the
    fixture values. The wait time can be configured via the `latency`
    property.

    @property simulateRemoteResponse
    @type {Boolean}
    @default true
  */
  simulateRemoteResponse: true,

  /**
    By default the `FixtureAdapter` will simulate a wait of the
    `latency` milliseconds before resolving promises with the fixture
    values. This behavior can be turned off via the
    `simulateRemoteResponse` property.

    @property latency
    @type {Number}
    @default 50
  */
  latency: 50,

  /**
    Implement this method in order to provide data associated with a type

    @method fixturesForType
    @param {DS.Model} typeClass
    @return {Array}
  */
  fixturesForType(typeClass) {
    if (typeClass.FIXTURES) {
      var fixtures = Ember.A(typeClass.FIXTURES);
      return fixtures.map(function(fixture) {
        var fixtureIdType = typeof fixture.id;
        if (fixtureIdType !== "number" && fixtureIdType !== "string") {
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
    @param {Array} fixtures
    @param {Object} query
    @param {DS.Model} typeClass
    @return {(Promise|Array)}
  */
  queryFixtures(fixtures, query, typeClass) {
    Ember.assert('Not implemented: You must override the DS.FixtureAdapter::queryFixtures method to support querying the fixture store.');
  },

  /**
    @method updateFixtures
    @param {DS.Model} typeClass
    @param {Array} fixture
  */
  updateFixtures(typeClass, fixture) {
    if (!typeClass.FIXTURES) {
      typeClass.FIXTURES = [];
    }

    var fixtures = typeClass.FIXTURES;

    this.deleteLoadedFixture(typeClass, fixture);

    fixtures.push(fixture);
  },

  /**
    Implement this method in order to provide json for CRUD methods

    @method mockJSON
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {DS.Snapshot} snapshot
  */
  mockJSON(store, typeClass, snapshot) {
    return store.serializerFor(snapshot.modelName).serialize(snapshot, { includeId: true });
  },

  /**
    @method generateIdForRecord
    @param {DS.Store} store
    @return {String} id
  */
  generateIdForRecord(store) {
    return "fixture-" + counter++;
  },

  /**
    @method find
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {String} id
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  find(store, typeClass, id, snapshot) {
    var fixtures = this.fixturesForType(typeClass);
    var fixture;

    Ember.assert("Unable to find fixtures for model type "+typeClass.toString() +". If you're defining your fixtures using `Model.FIXTURES = ...`, please change it to `Model.reopenClass({ FIXTURES: ... })`.", fixtures);

    if (fixtures) {
      fixture = Ember.A(fixtures).findBy('id', id);
    }

    if (fixture) {
      return this.simulateRemoteCall(function() {
        return fixture;
      }, this);
    }
  },

  /**
    @method findMany
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Array} ids
    @param {Array} snapshots
    @return {Promise} promise
  */
  findMany(store, typeClass, ids, snapshots) {
    var fixtures = this.fixturesForType(typeClass);

    Ember.assert("Unable to find fixtures for model type "+typeClass.toString(), fixtures);

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
    @private
    @method findAll
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @return {Promise} promise
  */
  findAll(store, typeClass) {
    var fixtures = this.fixturesForType(typeClass);

    Ember.assert("Unable to find fixtures for model type "+typeClass.toString(), fixtures);

    return this.simulateRemoteCall(function() {
      return fixtures;
    }, this);
  },

  /**
    @private
    @method findQuery
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} query
    @param {DS.AdapterPopulatedRecordArray} array
    @return {Promise} promise
  */
  findQuery(store, typeClass, query, array) {
    var fixtures = this.fixturesForType(typeClass);

    Ember.assert("Unable to find fixtures for model type " + typeClass.toString(), fixtures);

    fixtures = this.queryFixtures(fixtures, query, typeClass);

    if (fixtures) {
      return this.simulateRemoteCall(function() {
        return fixtures;
      }, this);
    }
  },

  /**
    @method createRecord
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  createRecord(store, typeClass, snapshot) {
    var fixture = this.mockJSON(store, typeClass, snapshot);

    this.updateFixtures(typeClass, fixture);

    return this.simulateRemoteCall(function() {
      return fixture;
    }, this);
  },

  /**
    @method updateRecord
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  updateRecord(store, typeClass, snapshot) {
    var fixture = this.mockJSON(store, typeClass, snapshot);

    this.updateFixtures(typeClass, fixture);

    return this.simulateRemoteCall(function() {
      return fixture;
    }, this);
  },

  /**
    @method deleteRecord
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  deleteRecord(store, typeClass, snapshot) {
    this.deleteLoadedFixture(typeClass, snapshot);

    return this.simulateRemoteCall(function() {
      // no payload in a deletion
      return null;
    });
  },

  /*
    @method deleteLoadedFixture
    @private
    @param typeClass
    @param snapshot
  */
  deleteLoadedFixture(typeClass, snapshot) {
    var existingFixture = this.findExistingFixture(typeClass, snapshot);

    if (existingFixture) {
      var index = indexOf(typeClass.FIXTURES, existingFixture);
      typeClass.FIXTURES.splice(index, 1);
      return true;
    }
  },

  /*
    @method findExistingFixture
    @private
    @param typeClass
    @param snapshot
  */
  findExistingFixture(typeClass, snapshot) {
    var fixtures = this.fixturesForType(typeClass);
    var id = snapshot.id;

    return this.findFixtureById(fixtures, id);
  },

  /*
    @method findFixtureById
    @private
    @param fixtures
    @param id
  */
  findFixtureById(fixtures, id) {
    return Ember.A(fixtures).find(function(r) {
      if (''+get(r, 'id') === ''+id) {
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
  simulateRemoteCall(callback, context) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve) {
      var value = Ember.copy(callback.call(context), true);
      if (get(adapter, 'simulateRemoteResponse')) {
        // Schedule with setTimeout
        Ember.run.later(function() {
          resolve(value);
        }, get(adapter, 'latency'));
      } else {
        // Asynchronous, but at the of the runloop with zero latency
        Ember.run.schedule('actions', null, function() {
          resolve(value);
        });
      }
    }, "DS: FixtureAdapter#simulateRemoteCall");
  }
});
