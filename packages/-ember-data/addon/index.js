import 'ember-inflector';

import EmberError from '@ember/error';
import { VERSION } from '@ember/version';

import Adapter, { BuildURLMixin } from '@ember-data/adapter';
import AdapterError, {
  AbortError,
  ConflictError,
  errorsArrayToHash,
  errorsHashToArray,
  ForbiddenError,
  InvalidError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
} from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';
import DebugAdapter from '@ember-data/debug';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Serializer from '@ember-data/serializer';
import { BooleanTransform, DateTransform, NumberTransform, StringTransform } from '@ember-data/serializer/-private';
import JSONSerializer from '@ember-data/serializer/json';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import Transform from '@ember-data/serializer/transform';
import Store, { normalizeModelName } from '@ember-data/store';

import {
  AdapterPopulatedRecordArray,
  DS,
  Errors,
  InternalModel,
  ManyArray,
  PromiseArray,
  PromiseManyArray,
  PromiseObject,
  RecordArray,
  RecordArrayManager,
  Relationship,
  RootState,
  Snapshot,
} from './-private';
import initializeStoreService from './initialize-store-service';
import setupContainer from './setup-container';

if (VERSION.match(/^1\.([0-9]|1[0-2])\./)) {
  throw new EmberError(
    'Ember Data requires at least Ember 1.13.0, but you have ' +
      VERSION +
      '. Please upgrade your version of Ember, then upgrade Ember Data.'
  );
}

DS.Store = Store;
DS.PromiseArray = PromiseArray;
DS.PromiseObject = PromiseObject;

DS.PromiseManyArray = PromiseManyArray;

DS.Model = Model;
DS.RootState = RootState;
DS.attr = attr;
DS.Errors = Errors;

DS.InternalModel = InternalModel;
DS.Snapshot = Snapshot;

DS.Adapter = Adapter;

DS.AdapterError = AdapterError;
DS.InvalidError = InvalidError;
DS.TimeoutError = TimeoutError;
DS.AbortError = AbortError;

DS.UnauthorizedError = UnauthorizedError;
DS.ForbiddenError = ForbiddenError;
DS.NotFoundError = NotFoundError;
DS.ConflictError = ConflictError;
DS.ServerError = ServerError;

DS.errorsHashToArray = errorsHashToArray;
DS.errorsArrayToHash = errorsArrayToHash;

DS.Serializer = Serializer;

DS.DebugAdapter = DebugAdapter;

DS.RecordArray = RecordArray;
DS.AdapterPopulatedRecordArray = AdapterPopulatedRecordArray;
DS.ManyArray = ManyArray;

DS.RecordArrayManager = RecordArrayManager;

DS.RESTAdapter = RESTAdapter;
DS.BuildURLMixin = BuildURLMixin;

DS.RESTSerializer = RESTSerializer;
DS.JSONSerializer = JSONSerializer;

DS.JSONAPIAdapter = JSONAPIAdapter;
DS.JSONAPISerializer = JSONAPISerializer;

DS.Transform = Transform;
DS.DateTransform = DateTransform;
DS.StringTransform = StringTransform;
DS.NumberTransform = NumberTransform;
DS.BooleanTransform = BooleanTransform;

DS.EmbeddedRecordsMixin = EmbeddedRecordsMixin;

DS.belongsTo = belongsTo;
DS.hasMany = hasMany;

DS.Relationship = Relationship;

DS._setupContainer = setupContainer;
DS._initializeStoreService = initializeStoreService;

Object.defineProperty(DS, 'normalizeModelName', {
  enumerable: true,
  writable: false,
  configurable: false,
  value: normalizeModelName,
});

export default DS;
