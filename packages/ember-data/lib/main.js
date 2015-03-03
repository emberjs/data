/**
  Ember Data
  @module ember-data
  @main ember-data
*/

// support RSVP 2.x via resolve,  but prefer RSVP 3.x's Promise.cast
Ember.RSVP.Promise.cast = Ember.RSVP.Promise.cast || Ember.RSVP.resolve;

Ember.runInDebug(function() {
  if (Ember.VERSION.match(/1\.[0-7]\./)) {
    throw new Ember.Error("Ember Data requires at least Ember 1.8.0, but you have " +
                          Ember.VERSION +
                          ". Please upgrade your version of Ember, then upgrade Ember Data");
  }
});

import DS from "ember-data/core";
import "ember-data/ext/date";

import {
  PromiseArray,
  PromiseObject,
  PromiseManyArray
} from "ember-data/system/promise_proxies";
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
import {
  InvalidError,
  Adapter
} from "ember-data/system/adapter";
import Serializer from "ember-data/system/serializer";
import DebugAdapter from "ember-data/system/debug";
import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray,
  ManyArray
} from "ember-data/system/record_arrays";
import RecordArrayManager from "ember-data/system/record_array_manager";
import {
  RESTAdapter,
  FixtureAdapter
} from "ember-data/adapters";
import JSONSerializer from "ember-data/serializers/json_serializer";
import RESTSerializer from "ember-data/serializers/rest_serializer";
import "ember-inflector";
import EmbeddedRecordsMixin from "ember-data/serializers/embedded_records_mixin";
import {
  ActiveModelAdapter,
  ActiveModelSerializer
} from "activemodel-adapter";

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

import ContainerProxy from "ember-data/system/container_proxy";
import Relationship from "ember-data/system/relationships/state/relationship";

DS.Store         = Store;
DS.PromiseArray  = PromiseArray;
DS.PromiseObject = PromiseObject;

DS.PromiseManyArray = PromiseManyArray;

DS.Model     = Model;
DS.RootState = RootState;
DS.attr      = attr;
DS.Errors    = Errors;

DS.Snapshot = Snapshot;

DS.Adapter      = Adapter;
DS.InvalidError = InvalidError;

DS.Serializer = Serializer;

DS.DebugAdapter = DebugAdapter;

DS.RecordArray                 = RecordArray;
DS.FilteredRecordArray         = FilteredRecordArray;
DS.AdapterPopulatedRecordArray = AdapterPopulatedRecordArray;
DS.ManyArray                   = ManyArray;

DS.RecordArrayManager = RecordArrayManager;

DS.RESTAdapter    = RESTAdapter;
DS.FixtureAdapter = FixtureAdapter;

DS.RESTSerializer = RESTSerializer;
DS.JSONSerializer = JSONSerializer;

DS.Transform       = Transform;
DS.DateTransform   = DateTransform;
DS.StringTransform = StringTransform;
DS.NumberTransform = NumberTransform;
DS.BooleanTransform = BooleanTransform;

DS.ActiveModelAdapter    = ActiveModelAdapter;
DS.ActiveModelSerializer = ActiveModelSerializer;
DS.EmbeddedRecordsMixin  = EmbeddedRecordsMixin;

DS.belongsTo = belongsTo;
DS.hasMany   = hasMany;

DS.Relationship  = Relationship;

DS.ContainerProxy = ContainerProxy;

DS._setupContainer = setupContainer;

Ember.lookup.DS = DS;

export default DS;
