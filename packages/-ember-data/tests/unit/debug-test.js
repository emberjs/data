import { computed } from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('Debug', function(hooks) {
  setupTest(hooks);

  test('_debugInfo groups the attributes and relationships correctly', function(assert) {
    const MaritalStatus = Model.extend({
      name: attr('string'),
    });

    const Post = Model.extend({
      title: attr('string'),
    });

    const User = Model.extend({
      name: attr('string'),
      isDrugAddict: attr('boolean'),
      maritalStatus: belongsTo('marital-status', { async: false }),
      posts: hasMany('post', { async: false }),
    });

    this.owner.register('model:marital-status', MaritalStatus);
    this.owner.register('model:post', Post);
    this.owner.register('model:user', User);

    let record = this.owner.lookup('service:store').createRecord('user');

    let propertyInfo = record._debugInfo().propertyInfo;

    assert.equal(propertyInfo.groups.length, 4);
    assert.equal(propertyInfo.groups[0].name, 'Attributes');
    assert.deepEqual(propertyInfo.groups[0].properties, ['id', 'name', 'isDrugAddict']);
    assert.equal(propertyInfo.groups[1].name, 'belongsTo');
    assert.deepEqual(propertyInfo.groups[1].properties, ['maritalStatus']);
    assert.equal(propertyInfo.groups[2].name, 'hasMany');
    assert.deepEqual(propertyInfo.groups[2].properties, ['posts']);
  });

  test('_debugInfo supports arbitray relationship types', function(assert) {
    const MaritalStatus = Model.extend({
      name: attr('string'),
    });

    const Post = Model.extend({
      title: attr('string'),
    });

    const User = Model.extend({
      name: attr('string'),
      isDrugAddict: attr('boolean'),
      maritalStatus: belongsTo('marital-status', { async: false }),
      posts: computed(() => [1, 2, 3])
        .readOnly()
        .meta({
          options: { inverse: null },
          isRelationship: true,
          kind: 'customRelationship',
          name: 'posts',
          type: 'post',
        }),
    });

    this.owner.register('model:marital-status', MaritalStatus);
    this.owner.register('model:post', Post);
    this.owner.register('model:user', User);

    let record = this.owner.lookup('service:store').createRecord('user');

    let propertyInfo = record._debugInfo().propertyInfo;

    assert.deepEqual(propertyInfo, {
      includeOtherProperties: true,
      groups: [
        {
          name: 'Attributes',
          properties: ['id', 'name', 'isDrugAddict'],
          expand: true,
        },
        {
          name: 'belongsTo',
          properties: ['maritalStatus'],
          expand: true,
        },
        {
          name: 'customRelationship',
          properties: ['posts'],
          expand: true,
        },
        {
          name: 'Flags',
          properties: ['isLoaded', 'hasDirtyAttributes', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid'],
        },
      ],
      expensiveProperties: ['maritalStatus', 'posts'],
    });
  });
});
