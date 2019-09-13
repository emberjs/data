import { VERSION } from '@ember/version';
import EmberError from '@ember/error';

if (VERSION.match(/^1\.([0-9]|1[0-2])\./)) {
  throw new EmberError(
    'Ember Data requires at least Ember 1.13.0, but you have ' +
      VERSION +
      '. Please upgrade your version of Ember, then upgrade Ember Data.'
  );
}

import Store, { normalizeModelName } from '@ember-data/store';

import {
  Snapshot,
  DebugAdapter,
  InternalModel,
  DS,
  Errors,
  RootState,
  PromiseArray,
  PromiseObject,
  PromiseManyArray,
  RecordArray,
  AdapterPopulatedRecordArray,
  ManyArray,
  RecordArrayManager,
  Relationship,
} from './-private';

import 'ember-inflector';
import setupContainer from './setup-container';
import initializeStoreService from './initialize-store-service';

import Transform from '@ember-data/serializer/transform';

import { BooleanTransform, DateTransform, NumberTransform, StringTransform } from '@ember-data/serializer/-private';

import Adapter, { BuildURLMixin } from '@ember-data/adapter';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';

import AdapterError, {
  AbortError,
  ConflictError,
  ForbiddenError,
  InvalidError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
  errorsArrayToHash,
  errorsHashToArray,
} from '@ember-data/adapter/error';

import Serializer from '@ember-data/serializer';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import JSONSerializer from '@ember-data/serializer/json';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

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
