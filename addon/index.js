import EmberError from '@ember/error';
import Ember from "ember";
import { deprecate } from '@ember/debug';

/**
  Ember Data
  @module ember-data
  @main ember-data
*/

if (Ember.VERSION.match(/^1\.([0-9]|1[0-2])\./)) {
  throw new EmberError("Ember Data requires at least Ember 1.13.0, but you have " +
                        Ember.VERSION +
                        ". Please upgrade your version of Ember, then upgrade Ember Data.");
}

import {
  Snapshot,
  DebugAdapter,
  InternalModel,
  DS,
  BuildURLMixin,
  belongsTo,
  hasMany,
  global,
  Errors,
  RootState,
  Model,
  Store,
  normalizeModelName,
  PromiseArray,
  PromiseObject,
  PromiseManyArray,
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray,
  ManyArray,
  RecordArrayManager,
  Relationship,
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
} from './-private';

import "ember-inflector";
import setupContainer from "./setup-container";
import initializeStoreService from './instance-initializers/initialize-store-service';

import Transform from './transforms/transform';
import NumberTransform from './transforms/number';
import DateTransform from './transforms/date';
import StringTransform from './transforms/string';
import BooleanTransform from './transforms/boolean';

import Adapter from "./adapter";
import JSONAPIAdapter from './adapters/json-api';
import RESTAdapter from './adapters/rest';

import Serializer from "./serializer";
import JSONAPISerializer from './serializers/json-api';
import JSONSerializer from './serializers/json';
import RESTSerializer from './serializers/rest';

import EmbeddedRecordsMixin from "./serializers/embedded-records-mixin";
import attr from './attr';

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

DS.UnauthorizedError = UnauthorizedError;
DS.ForbiddenError    = ForbiddenError;
DS.NotFoundError     = NotFoundError;
DS.ConflictError     = ConflictError;
DS.ServerError       = ServerError;

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
