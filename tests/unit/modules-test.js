import { module, test } from 'qunit';

import Transform from 'ember-data/transform';

import Adapter from 'ember-data/adapter';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import RESTAdapter from 'ember-data/adapters/rest';

import Store from 'ember-data/store';

import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';

import Serializer from 'ember-data/serializer';
import JSONSerializer from 'ember-data/serializers/json';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import RESTSerializer from 'ember-data/serializers/rest';
import EmbeddedRecordsMixin from 'ember-data/serializers/embedded-records-mixin';

import {
  AdapterError,
  InvalidError,
  TimeoutError,
  AbortError
} from 'ember-data/adapters/errors';

module('unit/modules - public modules');

test('ember-data/transform', function(assert) {
  assert.ok(Transform);
});

test('ember-data/adapter', function(assert) {
  assert.ok(Adapter);
});

test('ember-data/adapters/json-api', function(assert) {
  assert.ok(JSONAPIAdapter);
});

test('ember-data/adapters/rest', function(assert) {
  assert.ok(RESTAdapter);
});

test('ember-data/attr', function(assert) {
  assert.ok(attr);
});

test('ember-data/relationships', function(assert) {
  assert.ok(belongsTo);
  assert.ok(hasMany);
});

test('ember-data/store', function(assert) {
  assert.ok(Store);
});

test('ember-data/model', function(assert) {
  assert.ok(Model);
});

test('ember-data/mixins/embedded-records', function(assert) {
  assert.ok(EmbeddedRecordsMixin);
});

test('ember-data/serializer', function(assert) {
  assert.ok(Serializer);
});

test('ember-data/serializers/json-api', function(assert) {
  assert.ok(JSONAPISerializer);
});

test('ember-data/serializers/json', function(assert) {
  assert.ok(JSONSerializer);
});

test('ember-data/serializers/rest', function(assert) {
  assert.ok(RESTSerializer);
});

test('ember-data/adapters/errors', function(assert) {
  assert.ok(AdapterError);
  assert.ok(InvalidError);
  assert.ok(TimeoutError);
  assert.ok(AbortError);
});
