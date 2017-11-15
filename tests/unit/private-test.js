import { module, test } from 'qunit';
import {
  ContainerInstanceCache,
  InternalModel,
  RootState
} from 'ember-data/-private';

module('-private');

test('`ContainerInstanceCache` is accessible via private import', function(assert) {
  assert.ok(!!ContainerInstanceCache);
});

test('`InternalModel` is accessible via private import', function(assert) {
  assert.ok(!!InternalModel);
});

test('`RootState` is accessible via private import', function(assert) {
  assert.ok(!!RootState);
});
