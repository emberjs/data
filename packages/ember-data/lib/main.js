/**
  Ember Data

  @module ember-data
  @main ember-data
*/

import DS from "./core";
import "./ext/date";

import {Store, PromiseArray, PromiseObject} from "./system/store";
import {Model, RootState, attr} from "./system/model";
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

DS.Store         = Store;
DS.PromiseArray  = PromiseArray;
DS.PromiseObject = PromiseObject;

DS.Model     = Model;
DS.RootState = RootState;
DS.attr      = attr;

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

export default DS;
