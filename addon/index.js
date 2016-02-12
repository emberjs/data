import Ember from "ember";
import { warn } from "ember-data/-private/debug";
/**
  Ember Data
  @module ember-data
  @main ember-data
*/

if (Ember.VERSION.match(/^1\.([0-9]|1[0-2])\./)) {
  throw new Ember.Error("Ember Data requires at least Ember 1.13.0, but you have " +
                        Ember.VERSION +
                        ". Please upgrade your version of Ember, then upgrade Ember Data.");
}

if (Ember.VERSION.match(/^1\.13\./)) {
  warn(`Use of Ember Data 2+ with Ember 1.13 is unsupported. Please upgrade your version of Ember to 2.0 or higher.`, false, {
    id: 'ds.version.ember-1-13'
  });
}

import DS from "ember-data/-private/core";

import normalizeModelName from "ember-data/-private/system/normalize-model-name";

import InternalModel from "ember-data/-private/system/model/internal-model";

import {
  PromiseArray,
  PromiseObject,
  PromiseManyArray
} from "ember-data/-private/system/promise-proxies";
import {
  Store
} from "ember-data/-private/system/store";
import {
  Errors,
  RootState,
  attr
} from "ember-data/-private/system/model";
import Model from "ember-data/model";
import Snapshot from "ember-data/-private/system/snapshot";
import Adapter from "ember-data/adapter";
import Serializer from "ember-data/serializer";
import DebugAdapter from "ember-data/-private/system/debug";

import {
  AdapterError,
  InvalidError,
  TimeoutError,
  AbortError,
  errorsHashToArray,
  errorsArrayToHash
} from "ember-data/-private/adapters/errors";

import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray
} from "ember-data/-private/system/record-arrays";
import ManyArray from "ember-data/-private/system/many-array";
import RecordArrayManager from "ember-data/-private/system/record-array-manager";
import {
  JSONAPIAdapter,
  RESTAdapter
} from "ember-data/-private/adapters";
import BuildURLMixin from "ember-data/-private/adapters/build-url-mixin";
import {
  JSONAPISerializer,
  JSONSerializer,
  RESTSerializer
} from "ember-data/-private/serializers";
import "ember-inflector";
import EmbeddedRecordsMixin from "ember-data/serializers/embedded-records-mixin";

import {
  Transform,
  DateTransform,
  NumberTransform,
  StringTransform,
  BooleanTransform
} from "ember-data/-private/transforms";

import {hasMany, belongsTo} from "ember-data/relationships";
import setupContainer from "ember-data/setup-container";
import initializeStoreService from 'ember-data/-private/instance-initializers/initialize-store-service';

import ContainerProxy from "ember-data/-private/system/container-proxy";
import Relationship from "ember-data/-private/system/relationships/state/relationship";

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
DS._initializeStoreService = initializeStoreService;

Object.defineProperty(DS, 'normalizeModelName', {
  enumerable: true,
  writable: false,
  configurable: false,
  value: normalizeModelName
});

Ember.lookup.DS = DS;

export default DS;
