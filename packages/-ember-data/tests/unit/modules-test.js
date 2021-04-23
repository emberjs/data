import { module, test } from 'qunit';

import Adapter from '@ember-data/adapter';
import AdapterError, { AbortError, InvalidError, TimeoutError } from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Serializer from '@ember-data/serializer';
import JSONSerializer from '@ember-data/serializer/json';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import Transform from '@ember-data/serializer/transform';
import Store from '@ember-data/store';

module('unit/modules - public modules', function () {
  test('ember-data/transform', function (assert) {
    assert.ok(Transform);
  });

  test('ember-data/adapter', function (assert) {
    assert.ok(Adapter);
  });

  test('ember-data/adapters/json-api', function (assert) {
    assert.ok(JSONAPIAdapter);
  });

  test('ember-data/adapters/rest', function (assert) {
    assert.ok(RESTAdapter);
  });

  test('ember-data/attr', function (assert) {
    assert.ok(attr);
  });

  test('ember-data/relationships', function (assert) {
    assert.ok(belongsTo);
    assert.ok(hasMany);
  });

  test('ember-data/store', function (assert) {
    assert.ok(Store);
  });

  test('ember-data/model', function (assert) {
    assert.ok(Model);
  });

  test('ember-data/mixins/embedded-records', function (assert) {
    assert.ok(EmbeddedRecordsMixin);
  });

  test('ember-data/serializer', function (assert) {
    assert.ok(Serializer);
  });

  test('ember-data/serializers/json-api', function (assert) {
    assert.ok(JSONAPISerializer);
  });

  test('ember-data/serializers/json', function (assert) {
    assert.ok(JSONSerializer);
  });

  test('ember-data/serializers/rest', function (assert) {
    assert.ok(RESTSerializer);
  });

  test('ember-data/adapters/errors', function (assert) {
    assert.ok(AdapterError);
    assert.ok(InvalidError);
    assert.ok(TimeoutError);
    assert.ok(AbortError);
  });
});
