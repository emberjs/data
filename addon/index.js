import Ember from "ember";
import { deprecate } from "ember-data/-private/debug";
import isEnabled from "./-private/features";
import global from "./-private/global";

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

import DS from "./-private/core";

import normalizeModelName from "./-private/system/normalize-model-name";

import InternalModel from "./-private/system/model/internal-model";

import {
  PromiseArray,
  PromiseObject,
  PromiseManyArray
} from "./-private/system/promise-proxies";
import {
  Store
} from "./-private/system/store";
import {
  Errors,
  RootState,
  attr
} from "./-private/system/model";
import Model from "./model";
import Snapshot from "./-private/system/snapshot";
import Adapter from "./adapter";
import Serializer from "./serializer";
import DebugAdapter from "ember-data/-private/debug";

import {
  AdapterError,
  InvalidError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServerError,
  TimeoutError,
  AbortError,
  errorsHashToArray,
  errorsArrayToHash
} from "./adapters/errors";

import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray
} from "./-private/system/record-arrays";
import ManyArray from "./-private/system/many-array";
import RecordArrayManager from "./-private/system/record-array-manager";
import {
  JSONAPIAdapter,
  RESTAdapter
} from "./-private/adapters";
import BuildURLMixin from "./-private/adapters/build-url-mixin";
import {
  JSONAPISerializer,
  JSONSerializer,
  RESTSerializer
} from "./-private/serializers";
import "ember-inflector";
import EmbeddedRecordsMixin from "./serializers/embedded-records-mixin";

import {
  Transform,
  DateTransform,
  NumberTransform,
  StringTransform,
  BooleanTransform
} from "./-private/transforms";

import {hasMany, belongsTo} from "./relationships";
import setupContainer from "./setup-container";
import initializeStoreService from './-private/instance-initializers/initialize-store-service';

import Relationship from "./-private/system/relationships/state/relationship";

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

if (isEnabled('ds-extended-errors')) {
  DS.UnauthorizedError = UnauthorizedError;
  DS.ForbiddenError    = ForbiddenError;
  DS.NotFoundError     = NotFoundError;
  DS.ConflictError     = ConflictError;
  DS.ServerError       = ServerError;
}

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

DS._setupContainer = setupContainer;
DS._initializeStoreService = initializeStoreService;

Object.defineProperty(DS, 'normalizeModelName', {
  enumerable: true,
  writable: false,
  configurable: false,
  value: normalizeModelName
});

Object.defineProperty(global, 'DS', {
  configurable: true,
  get() {
    deprecate(
      'Using the global version of DS is deprecated. Please either import ' +
        'the specific modules needed or `import DS from \'ember-data\';`.',
      false,
      { id: 'ember-data.global-ds', until: '3.0.0' }
    );

    return DS;
  }
});

export default DS;
