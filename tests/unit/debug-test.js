import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

const { run } = Ember;

const TestAdapter = DS.Adapter.extend();

module('Debug');

test('_debugInfo groups the attributes and relationships correctly', function(assert) {
  const MaritalStatus = DS.Model.extend({
    name: DS.attr('string')
  });

  const Post = DS.Model.extend({
    title: DS.attr('string')
  });

  const User = DS.Model.extend({
    name: DS.attr('string'),
    isDrugAddict: DS.attr('boolean'),
    maritalStatus: DS.belongsTo('marital-status', { async: false }),
    posts: DS.hasMany('post', { async: false })
  });

  let store = createStore({
    adapter: TestAdapter.extend(),
    maritalStatus: MaritalStatus,
    post: Post,
    user: User
  });

  let record = run(() => store.createRecord('user'));

  let propertyInfo = record._debugInfo().propertyInfo;

  assert.equal(propertyInfo.groups.length, 4);
  assert.deepEqual(propertyInfo.groups[0].properties, ['id', 'name', 'isDrugAddict']);
  assert.deepEqual(propertyInfo.groups[1].properties, ['maritalStatus']);
  assert.deepEqual(propertyInfo.groups[2].properties, ['posts']);
});

test('_debugInfo supports arbitray relationship types', function(assert) {
  const MaritalStatus = DS.Model.extend({
    name: DS.attr('string')
  });

  const Post = DS.Model.extend({
    title: DS.attr('string')
  });

  const User = DS.Model.extend({
    name: DS.attr('string'),
    isDrugAddict: DS.attr('boolean'),
    maritalStatus: DS.belongsTo('marital-status', { async: false }),
    posts: Ember.computed(() => [1, 2, 3] )
    .readOnly().meta({
      options: { inverse: null },
      isRelationship: true,
      kind: 'customRelationship',
      name: 'Custom Relationship',
      type: 'post'
    })
  });

  let store = createStore({
    adapter: TestAdapter.extend(),
    maritalStatus: MaritalStatus,
    post: Post,
    user: User
  });

  let record = run(() => store.createRecord('user'));

  let propertyInfo = record._debugInfo().propertyInfo;

  assert.deepEqual(propertyInfo, {
    includeOtherProperties: true,
    groups: [
      {
        name: 'Attributes',
        properties: [
          'id',
          'name',
          'isDrugAddict'
        ],
        expand: true
      },
      {
        name: 'Belongs To',
        properties: [
          'maritalStatus'
        ],
        expand: true
      },
      {
        name: 'Custom Relationship',
        properties: [
          'posts'
        ],
        expand: true
      },
      {
        name: 'Flags',
        properties: [
          'isLoaded',
          'hasDirtyAttributes',
          'isSaving',
          'isDeleted',
          'isError',
          'isNew',
          'isValid'
        ]
      }
    ],
    expensiveProperties: [
      'maritalStatus',
      'posts'
    ]
  })
});
