import DS from 'ember-data';

import {module, test} from 'qunit';

var env, adapter;

module("unit/adapters/build-url-mixin/path-for-type - DS.BuildURLMixin#pathForType", {
  beforeEach: function() {

    // test for overriden pathForType methods which return null path values
    var customPathForType = {
      pathForType: function(type) {
        if (type === 'rootModel') { return ''; }
        return this._super(type);
      }
    };

    var Adapter = DS.Adapter.extend(DS.BuildURLMixin, customPathForType);

    env = setupStore({
      adapter: Adapter
    });

    adapter = env.adapter;
  }
});

test('pathForType - works with camelized types', function(assert) {
  assert.equal(adapter.pathForType('superUser'), "superUsers");
});

test('pathForType - works with dasherized types', function(assert) {
  assert.equal(adapter.pathForType('super-user'), "superUsers");
});

test('pathForType - works with underscored types', function(assert) {
  assert.equal(adapter.pathForType('super_user'), "superUsers");
});

test('buildURL - works with empty paths', function(assert) {
  assert.equal(adapter.buildURL('rootModel', 1), "/1");
});

test('buildURL - find requestType delegates to urlForFindRecord', function(assert) {
  assert.expect(4);
  var snapshotStub = { snapshot: true };
  var originalMethod = adapter.urlForFindRecord;
  adapter.urlForFindRecord = function(id, type, snapshot) {
    assert.equal(id, 1);
    assert.equal(type, 'super-user');
    assert.equal(snapshot, snapshotStub);
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', 1, snapshotStub, 'findRecord'), '/superUsers/1');
});

test('buildURL - findAll requestType delegates to urlForFindAll', function(assert) {
  assert.expect(2);
  var originalMethod = adapter.urlForFindAll;
  adapter.urlForFindAll = function(type) {
    assert.equal(type, 'super-user');
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', null, null, 'findAll'), '/superUsers');
});

test('buildURL - query requestType delegates to urlForQuery', function(assert) {
  assert.expect(3);
  var originalMethod = adapter.urlForQuery;
  var queryStub = { limit: 10 };
  adapter.urlForQuery = function(query, type) {
    assert.equal(query, queryStub);
    assert.equal(type, 'super-user');
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', null, null, 'query', queryStub), '/superUsers');
});

test('buildURL - queryRecord requestType delegates to urlForQueryRecord', function(assert) {
  assert.expect(3);
  var originalMethod = adapter.urlForQueryRecord;
  var queryStub = { companyId: 10 };
  adapter.urlForQueryRecord = function(query, type) {
    assert.equal(query, queryStub);
    assert.equal(type, 'super-user');
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', null, null, 'queryRecord', queryStub), '/superUsers');
});

test('buildURL - findMany requestType delegates to urlForFindMany', function(assert) {
  assert.expect(3);
  var originalMethod = adapter.urlForFindMany;
  var idsStub = [1, 2, 3];
  adapter.urlForFindMany = function(ids, type) {
    assert.equal(ids, idsStub);
    assert.equal(type, 'super-user');
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', idsStub, null, 'findMany'), '/superUsers');
});

test('buildURL - findHasMany requestType delegates to urlForFindHasMany', function(assert) {
  assert.expect(3);
  var originalMethod = adapter.urlForFindHasMany;
  adapter.urlForFindHasMany = function(id, type) {
    assert.equal(id, 1);
    assert.equal(type, 'super-user');
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', 1, null, 'findHasMany'), '/superUsers/1');
});

test('buildURL - findBelongsTo requestType delegates to urlForFindBelongsTo', function(assert) {
  assert.expect(3);
  var originalMethod = adapter.urlForFindBelongsTo;
  adapter.urlForFindBelongsTo = function(id, type) {
    assert.equal(id, 1);
    assert.equal(type, 'super-user');
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', 1, null, 'findBelongsTo'), '/superUsers/1');
});

test('buildURL - createRecord requestType delegates to urlForCreateRecord', function(assert) {
  assert.expect(3);
  var snapshotStub = { snapshot: true };
  var originalMethod = adapter.urlForCreateRecord;
  adapter.urlForCreateRecord = function(type, snapshot) {
    assert.equal(type, 'super-user');
    assert.equal(snapshot, snapshotStub);
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', null, snapshotStub, 'createRecord'), '/superUsers');
});

test('buildURL - updateRecord requestType delegates to urlForUpdateRecord', function(assert) {
  assert.expect(4);
  var snapshotStub = { snapshot: true };
  var originalMethod = adapter.urlForUpdateRecord;
  adapter.urlForUpdateRecord = function(id, type, snapshot) {
    assert.equal(id, 1);
    assert.equal(type, 'super-user');
    assert.equal(snapshot, snapshotStub);
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', 1, snapshotStub, 'updateRecord'), '/superUsers/1');
});

test('buildURL - deleteRecord requestType delegates to urlForDeleteRecord', function(assert) {
  assert.expect(4);
  var snapshotStub = { snapshot: true };
  var originalMethod = adapter.urlForDeleteRecord;
  adapter.urlForDeleteRecord = function(id, type, snapshot) {
    assert.equal(id, 1);
    assert.equal(type, 'super-user');
    assert.equal(snapshot, snapshotStub);
    return originalMethod.apply(this, arguments);
  };
  assert.equal(adapter.buildURL('super-user', 1, snapshotStub, 'deleteRecord'), '/superUsers/1');
});

test('buildURL - unknown requestType', function(assert) {
  assert.equal(adapter.buildURL('super-user', 1, null, 'unknown'), '/superUsers/1');
  assert.equal(adapter.buildURL('super-user', null, null, 'unknown'), '/superUsers');
});
