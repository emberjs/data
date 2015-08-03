/**
  Ember Data
  @module ember-data
  @main ember-data
*/

if (Ember.VERSION.match(/^1\.[0-7]\./)) {
  throw new Ember.Error("Ember Data requires at least Ember 1.8.0, but you have " +
                        Ember.VERSION +
                        ". Please upgrade your version of Ember, then upgrade Ember Data");
}

if (Ember.VERSION.match(/^1\.12\.0/)) {
  throw new Ember.Error("Ember Data does not work with Ember 1.12.0. Please upgrade to Ember 1.12.1 or higher.");
}

import DS from "ember-data/core";
import "ember-data/ext/date";

import normalizeModelName from "ember-data/system/normalize-model-name";

import InternalModel from "ember-data/system/model/internal-model";

import {
  PromiseArray,
  PromiseObject,
  PromiseManyArray
} from "ember-data/system/promise-proxies";
import {
  Store
} from "ember-data/system/store";
import {
  Errors,
  RootState,
  attr
} from "ember-data/system/model";
import Model from "ember-data/system/model";
import Snapshot from "ember-data/system/snapshot";
import Adapter from "ember-data/system/adapter";
import Serializer from "ember-data/system/serializer";
import DebugAdapter from "ember-data/system/debug";

import {
  AdapterError,
  InvalidError,
  TimeoutError,
  AbortError,
  errorsHashToArray,
  errorsArrayToHash
} from "ember-data/adapters/errors";

import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray
} from "ember-data/system/record-arrays";
import ManyArray from "ember-data/system/many-array";
import RecordArrayManager from "ember-data/system/record-array-manager";
import {
  FixtureAdapter,
  JSONAPIAdapter,
  RESTAdapter
} from "ember-data/adapters";
import BuildURLMixin from "ember-data/adapters/build-url-mixin";
import {
  JSONAPISerializer,
  JSONSerializer,
  RESTSerializer
} from "ember-data/serializers";
import "ember-inflector";
import EmbeddedRecordsMixin from "ember-data/serializers/embedded-records-mixin";

import {
  Transform,
  DateTransform,
  NumberTransform,
  StringTransform,
  BooleanTransform
} from "ember-data/transforms";

import {hasMany, belongsTo} from "ember-data/system/relationships";
import "ember-data/ember-initializer";
import setupContainer from "ember-data/setup-container";

import ContainerProxy from "ember-data/system/container-proxy";
import Relationship from "ember-data/system/relationships/state/relationship";

DS.Store         = Store;
DS.PromiseArray  = PromiseArray;
DS.PromiseObject = PromiseObject;

DS.PromiseManyArray = PromiseManyArray;

DS.Model     = Model;
DS.RootState = RootState;
DS.attr      = attr;
DS.Errors    = Errors;

DS.InternalModel = InternalModel;
DS.Snapshot = Snapshot;

DS.Adapter      = Adapter;

DS.AdapterError = AdapterError;
DS.InvalidError = InvalidError;
DS.TimeoutError = TimeoutError;
DS.AbortError   = AbortError;

DS.errorsHashToArray = errorsHashToArray;
DS.errorsArrayToHash = errorsArrayToHash;

DS.Serializer = Serializer;

DS.DebugAdapter = DebugAdapter;

DS.RecordArray                 = RecordArray;
DS.FilteredRecordArray         = FilteredRecordArray;
DS.AdapterPopulatedRecordArray = AdapterPopulatedRecordArray;
DS.ManyArray                   = ManyArray;

DS.RecordArrayManager = RecordArrayManager;

DS.RESTAdapter    = RESTAdapter;
DS.BuildURLMixin  = BuildURLMixin;

DS.RESTSerializer = RESTSerializer;
DS.JSONSerializer = JSONSerializer;

DS.JSONAPIAdapter = JSONAPIAdapter;
DS.JSONAPISerializer = JSONAPISerializer;

DS.Transform       = Transform;
DS.DateTransform   = DateTransform;
DS.StringTransform = StringTransform;
DS.NumberTransform = NumberTransform;
DS.BooleanTransform = BooleanTransform;

DS.EmbeddedRecordsMixin  = EmbeddedRecordsMixin;

DS.belongsTo = belongsTo;
DS.hasMany   = hasMany;

DS.Relationship  = Relationship;

DS.ContainerProxy = ContainerProxy;

DS._setupContainer = setupContainer;

Object.defineProperty(DS, 'normalizeModelName', {
  enumerable: true,
  writable: false,
  configurable: false,
  value: normalizeModelName
});

var _FixtureAdapter = FixtureAdapter;

Object.defineProperty(DS, 'FixtureAdapter', {
  get: function() {
    if (_FixtureAdapter === FixtureAdapter) {
      Ember.deprecate('DS.FixtureAdapter has been deprecated and moved into an unsupported addon: https://github.com/emberjs/ember-data-fixture-adapter/tree/master', false, {
        id: 'ds.adapter.fixture-adapter-deprecated',
        until: '2.0.0'
      });
    }
    return _FixtureAdapter;
  },
  set:  function(FixtureAdapter) {
    _FixtureAdapter = FixtureAdapter;
  }
});

Ember.lookup.DS = DS;

export default DS;
