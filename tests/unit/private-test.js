import { module, test } from 'qunit';
import {
  InternalModel,
  RootState
} from 'ember-data/-private';

module('-private');

test('`InternalModel` is accessible via private import', function(assert) {
  assert.ok(!!InternalModel);
});

test('`RootState` is accessible via private import', function(assert) {
  assert.ok(!!RootState);
});
