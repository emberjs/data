require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/rest_serializer');

/**
  @module data
  @submodule data-adapters
*/

var get = Ember.get, set  = Ember.set;

var Node = function(reference) {
  this.reference = reference;
  this.record = reference.record;
  this.dirtyType = get(this.record, 'dirtyType');
  this.children = Ember.Set.create();
  this.parents = Ember.Set.create();
};

Node.prototype = {
  addChild: function(childNode) {
    this.children.add(childNode);
    childNode.parents.add(this);
  },

  isRoot: function() {
    return this.parents.every(function(parent) {
      return !get(parent, 'record.isDirty') && parent.isRoot();
    });
  }
};

DS.rejectionHandler = function(reason) {
  Ember.Logger.assert([reason, reason.message, reason.stack]);

  throw reason;
};

/**
  The REST adapter allows your store to communicate with an HTTP server by
  transmitting JSON via XHR. Most Ember.js apps that consume a JSON API
  should use the REST adapter.

  This adapter is designed around the idea that the JSON exchanged with
  the server should be conventional.

  ## JSON Structure

  The REST adapter expects the JSON returned from your server to follow
  these conventions.

  ### Object Root

  The JSON payload should be an object that contains the record inside a
  root property. For example, in response to a `GET` request for
  `/posts/1`, the JSON should look like this:

  ```js
  {
    "post": {
      title: "I'm Running to Reform the W3C's Tag",
      author: "Yehuda Katz"
    }
  }
  ```

  ### Conventional Names

  Attribute names in your JSON payload should be the underscored versions of
  the attributes in your Ember.js models.

  For example, if you have a `Person` model:

  ```js
  App.Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    occupation: DS.attr('string')
  });
  ```

  The JSON returned should look like this:

  ```js
  {
    "person": {
      "first_name": "Barack",
      "last_name": "Obama",
      "occupation": "President"
    }
  }
  ```

  @class RESTAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
*/
DS.RESTAdapter = DS.Adapter.extend({
  namespace: null,
  bulkCommit: false,
  since: 'since',

  serializer: DS.RESTSerializer,

  init: function() {
    this._super.apply(this, arguments);
  },

  save: function(store, commitDetails, relationshipChanges) {
    if(get(this, 'bulkCommit') !== false) {
      return this.saveBulk(store, commitDetails, relationshipChanges);
    }
    var adapter = this;

    var rootNodes = this._createDependencyGraph(store, commitDetails, relationshipChanges);

    function createNestedPromise(node) {
      var promise;
      if(!adapter.shouldSave(node.record) || !node.dirtyType) {
        // return an "identity" promise if we don't want to do anything
        promise = Ember.RSVP.resolve();
      } else if(node.dirtyType === "created") {
        promise = adapter.createRecord(store, node.reference.type, node.record);
      } else if(node.dirtyType === "updated") {
        promise = adapter.updateRecord(store, node.reference.type, node.record);
      } else if(node.dirtyType === "deleted") {
        promise = adapter.deleteRecord(store, node.reference.type, node.record);
      }
      if(node.children.length > 0) {
        promise = promise.then(function() {
          var childPromises = node.children.map(createNestedPromise);
          return Ember.RSVP.all(childPromises);
        });
      }
      return promise;
    }

    return Ember.RSVP.all(rootNodes.map(createNestedPromise));
  },

  // slightly more complex algorithm that will be
  // less optimal if bulkCommit is not available
  saveBulk: function(store, commitDetails, relationshipChanges) {
    var adapter = this;

    var rootNodes = this._createDependencyGraph(store, commitDetails, relationshipChanges);

    function createNestedPromises(nodes) {

      // 2d partition on operation and type
      var map = Ember.MapWithDefault.create({
        defaultValue: function() {
          return Ember.MapWithDefault.create({
            defaultValue: function() {
              return Ember.OrderedSet.create();
            }
          });
        }
      });

      nodes.forEach(function(node) {
        var operation = adapter.shouldSave(node.record) && node.dirtyType || 'noop';
        map.get(operation).get(node.record.constructor).add(node);
      });

      function flatten(arr) {
        return arr.reduce(function(a, b) {
          return a.concat(b);
        }, []);
      }

      var promises = map.keys.toArray().map(function(operation) {
        var typeMap = map.get(operation);
        return typeMap.keys.toArray().map(function(type) {
          var nodes = typeMap.get(type);
          var records = Ember.OrderedSet.create();
          nodes.forEach(function(node) { records.add(node.record); });
          var promise = null;
          if (nodes.isEmpty() || operation === 'noop') {
            promise = Ember.RSVP.resolve();
          } else if (operation === "deleted") {
            promise = adapter.deleteRecords(store, type, records);
          } else if (operation === "created") {
            promise = adapter.createRecords(store, type, records);
          } else if (operation === "updated") {
            promise = adapter.updateRecords(store, type, records);
          }
          return promise.then(function() {
            var children = Ember.A(nodes.toArray()).map(function(node) { return node.children.toArray(); });
            return createNestedPromises(flatten(children));
          });
        });
      });

      return Ember.RSVP.all(flatten(promises));
    }

    return createNestedPromises(rootNodes);
  },

  _createDependencyGraph: function(store, commitDetails, relationshipChanges) {
    var adapter = this;
    var referenceToNode = Ember.MapWithDefault.create({
      defaultValue: function(reference) {
        return new Node(reference);
      }
    });

    relationshipChanges.forEach(function(r) {
      var childNode = referenceToNode.get(r.childReference);
      var parentNode = referenceToNode.get(r.parentReference);

      // In the non-embedded case, there is a potential request race
      // condition where the parent returns the id of a deleted child.
      // To solve for this we make the child delete complete first.
      if(r.changeType === 'remove' && adapter.shouldSave(childNode.record) && adapter.shouldSave(parentNode.record)) {
        childNode.addChild(parentNode);
      } else {
        parentNode.addChild(childNode);
      }
    });

    var rootNodes = Ember.Set.create();
    function filter(record) {
      var node = referenceToNode.get(get(record, '_reference'));
      if(node.isRoot()) {
        rootNodes.add(node);
      }
    }

    commitDetails.created.forEach(filter);
    commitDetails.updated.forEach(filter);
    commitDetails.deleted.forEach(filter);

    return rootNodes;
  },

  shouldSave: function(record) {
    var reference = get(record, '_reference');

    return !reference.parent;
  },

  shouldPreserveDirtyRecords: function(relationship) {
    return relationship.kind === 'hasMany';
  },

  dirtyRecordsForRecordChange: function(dirtySet, record) {
    this._dirtyTree(dirtySet, record);
  },

  dirtyRecordsForHasManyChange: function(dirtySet, record, relationship) {
    var embeddedType = get(this, 'serializer').embeddedType(record.constructor, relationship.secondRecordName);

    if (embeddedType === 'always') {
      relationship.childReference.parent = relationship.parentReference;
      this._dirtyTree(dirtySet, record);
    }
  },

  _dirtyTree: function(dirtySet, record) {
    dirtySet.add(record);

    get(this, 'serializer').eachEmbeddedRecord(record, function(embeddedRecord, embeddedType) {
      if (embeddedType !== 'always') { return; }
      if (dirtySet.has(embeddedRecord)) { return; }
      this._dirtyTree(dirtySet, embeddedRecord);
    }, this);

    var reference = record.get('_reference');

    if (reference.parent) {
      var store = get(record, 'store');
      var parent = store.recordForReference(reference.parent);
      this._dirtyTree(dirtySet, parent);
    }
  },

  createRecord: function(store, type, record) {
    var root = this.rootForType(type);
    var adapter = this;
    var data = {};

    data[root] = this.serialize(record, { includeId: true });

    return this.ajax(this.buildURL(root), "POST", {
      data: data
    }).then(function(json){
      adapter.didCreateRecord(store, type, record, json);
    }, function(xhr) {
      adapter.didError(store, type, record, xhr);
      throw xhr;
    }).then(null, DS.rejectionHandler);
  },

  createRecords: function(store, type, records) {
    var adapter = this;

    if (get(this, 'bulkCommit') === false) {
      return Ember.RSVP.all(records.map(function(record) {
        return this.createRecord(store, type, record);
      }, this));
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = [];
    records.forEach(function(record) {
      data[plural].push(this.serialize(record, { includeId: true }));
    }, this);

    return this.ajax(this.buildURL(root), "POST", {
      data: data
    }).then(function(json) {
      adapter.didCreateRecords(store, type, records, json);
    }).then(null, DS.rejectionHandler);
  },

  updateRecord: function(store, type, record) {
    var id, root, adapter, data;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    data = {};
    data[root] = this.serialize(record);

    return this.ajax(this.buildURL(root, id, record), "PUT",{
      data: data
    }).then(function(json){
      adapter.didUpdateRecord(store, type, record, json);
    }, function(xhr) {
      adapter.didError(store, type, record, xhr);
      throw xhr;
    }).then(null, DS.rejectionHandler);
  },

  updateRecords: function(store, type, records) {
    var root, plural, adapter, data;

    if (get(this, 'bulkCommit') === false) {
      return Ember.RSVP.all(records.map(function(record) {
        return this.updateRecord(store, type, record);
      }, this));
    }

    root = this.rootForType(type);
    plural = this.pluralize(root);
    adapter = this;

    data = {};

    data[plural] = [];

    records.forEach(function(record) {
      data[plural].push(this.serialize(record, { includeId: true }));
    }, this);

    return this.ajax(this.buildURL(root, "bulk"), "PUT", {
      data: data
    }).then(function(json) {
      adapter.didUpdateRecords(store, type, records, json);
    }).then(null, DS.rejectionHandler);
  },

  deleteRecord: function(store, type, record) {
    var id, root, adapter;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    return this.ajax(this.buildURL(root, id, record), "DELETE").then(function(json){
      adapter.didDeleteRecord(store, type, record, json);
    }, function(xhr){
      adapter.didError(store, type, record, xhr);
      throw xhr;
    }).then(null, DS.rejectionHandler);
  },

  deleteRecords: function(store, type, records) {
    var root, plural, serializer, adapter, data;

    if (get(this, 'bulkCommit') === false) {
      return Ember.RSVP.all(records.map(function(record) {
        return this.deleteRecord(store, type, record);
      }, this));
    }

    root = this.rootForType(type);
    plural = this.pluralize(root);
    serializer = get(this, 'serializer');
    adapter = this;

    data = {};

    data[plural] = [];
    records.forEach(function(record) {
      data[plural].push(serializer.serializeId( get(record, 'id') ));
    });

    return this.ajax(this.buildURL(root, 'bulk'), "DELETE", {
      data: data
    }).then(function(json){
      adapter.didDeleteRecords(store, type, records, json);
    }).then(null, DS.rejectionHandler);
  },

  find: function(store, type, id) {
    var root = this.rootForType(type), adapter = this;

    return this.ajax(this.buildURL(root, id), "GET").
      then(function(json){
        adapter.didFindRecord(store, type, json, id);
    }).then(null, DS.rejectionHandler);
  },

  findAll: function(store, type, since) {
    var root, adapter;

    root = this.rootForType(type);
    adapter = this;

    return this.ajax(this.buildURL(root), "GET",{
      data: this.sinceQuery(since)
    }).then(function(json) {
      adapter.didFindAll(store, type, json);
    }).then(null, DS.rejectionHandler);
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type),
    adapter = this;

    return this.ajax(this.buildURL(root), "GET", {
      data: query
    }).then(function(json){
      adapter.didFindQuery(store, type, json, recordArray);
    }).then(null, DS.rejectionHandler);
  },

  findMany: function(store, type, ids, owner) {
    var root = this.rootForType(type),
    adapter = this;

    ids = this.serializeIds(ids);

    return this.ajax(this.buildURL(root), "GET", {
      data: {ids: ids}
    }).then(function(json) {
      adapter.didFindMany(store, type, json);
    }).then(null, DS.rejectionHandler);
  },

  /**
    @private

    This method serializes a list of IDs using `serializeId`

    @return {Array} an array of serialized IDs
  */
  serializeIds: function(ids) {
    var serializer = get(this, 'serializer');

    return Ember.EnumerableUtils.map(ids, function(id) {
      return serializer.serializeId(id);
    });
  },

  didError: function(store, type, record, xhr) {
    if (xhr.status === 422) {
      var json = JSON.parse(xhr.responseText),
          serializer = get(this, 'serializer'),
          errors = serializer.extractValidationErrors(type, json);

      store.recordWasInvalid(record, errors);
    } else {
      this._super.apply(this, arguments);
    }
  },

  ajax: function(url, type, hash) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      hash = hash || {};
      hash.url = url;
      hash.type = type;
      hash.dataType = 'json';
      hash.context = adapter;

      if (hash.data && type !== 'GET') {
        hash.contentType = 'application/json; charset=utf-8';
        hash.data = JSON.stringify(hash.data);
      }

      hash.success = function(json) {
        Ember.run(null, resolve, json);
      };

      hash.error = function(jqXHR, textStatus, errorThrown) {
        Ember.run(null, reject, jqXHR);
      };

      Ember.$.ajax(hash);
    });
  },

  url: "",

  rootForType: function(type) {
    var serializer = get(this, 'serializer');
    return serializer.rootForType(type);
  },

  pluralize: function(string) {
    var serializer = get(this, 'serializer');
    return serializer.pluralize(string);
  },

  buildURL: function(root, suffix, record) {
    var url = [this.url];

    Ember.assert("Namespace URL (" + this.namespace + ") must not start with slash", !this.namespace || this.namespace.toString().charAt(0) !== "/");
    Ember.assert("Root URL (" + root + ") must not start with slash", !root || root.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");

    if (!Ember.isNone(this.namespace)) {
      url.push(this.namespace);
    }

    url.push(this.pluralize(root));
    if (suffix !== undefined) {
      url.push(suffix);
    }

    return url.join("/");
  },

  sinceQuery: function(since) {
    var query = {};
    query[get(this, 'since')] = since;
    return since ? query : null;
  }
});
