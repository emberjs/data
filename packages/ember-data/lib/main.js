/**
  Ember Data

  @module ember-data
  @main ember-data
*/

// support RSVP 2.x via resolve,  but prefer RSVP 3.x's Promise.cast
Ember.RSVP.Promise.cast = Ember.RSVP.Promise.cast || Ember.RSVP.resolve;

import DS from "./core";
import "./ext/date";

import {Store, PromiseArray, PromiseObject} from "./system/store";
import {Model, Errors, RootState, attr} from "./system/model";
import {
  AttributeChange,
  RelationshipChange,
  RelationshipChangeAdd,
  RelationshipChangeRemove,
  OneToManyChange,
  ManyToNoneChange,
  OneToOneChange,
  ManyToManyChange
} from "./system/changes";
import {InvalidError, Adapter} from "./system/adapter";
import DebugAdapter from "./system/debug";
import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray,
  ManyArray
} from "./system/record_arrays";
import RecordArrayManager from "./system/record_array_manager";
import {RESTAdapter, FixtureAdapter} from "./adapters";
import JSONSerializer from "./serializers/json_serializer";
import RESTSerializer from "./serializers/rest_serializer";
import "../../ember-inflector/lib/main";
import {
  ActiveModelAdapter,
  ActiveModelSerializer,
  EmbeddedRecordsMixin
} from "../../activemodel-adapter/lib/main";

import {
  Transform,
  DateTransform,
  NumberTransform,
  StringTransform,
  BooleanTransform
} from "./transforms";

import {hasMany, belongsTo} from "./system/relationships";
import "./initializers";

import ContainerProxy from "./system/container_proxy";

DS.Store         = Store;
DS.PromiseArray  = PromiseArray;
DS.PromiseObject = PromiseObject;

DS.Model     = Model;
DS.RootState = RootState;
DS.attr      = attr;
DS.Errors    = Errors;

DS.AttributeChange       = AttributeChange;
DS.RelationshipChange    = RelationshipChange;
DS.RelationshipChangeAdd = RelationshipChangeAdd;
DS.OneToManyChange       = OneToManyChange;
DS.ManyToNoneChange      = OneToManyChange;
DS.OneToOneChange        = OneToOneChange;
DS.ManyToManyChange      = ManyToManyChange;

DS.Adapter      = Adapter;
DS.InvalidError = InvalidError;

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

DS.ContainerProxy = ContainerProxy;

export default DS;
