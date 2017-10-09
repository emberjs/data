import { get } from '@ember/object';
import { RelationshipPayloadsManager } from 'ember-data/-private';
import DS from 'ember-data';
import { createStore } from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import testInDebug from 'dummy/tests/helpers/test-in-debug';

module('unit/system/relationships/relationship-payloads', {
  beforeEach() {
    const User = DS.Model.extend({
      purpose: DS.belongsTo('purpose', { inverse: 'user' }),
      hobbies: DS.hasMany('hobby', { inverse: 'user'}),
      friends: DS.hasMany('user', { inverse: 'friends' })
    });
    User.toString = () => 'User';

    const Hobby = DS.Model.extend({
      user: DS.belongsTo('user', { inverse: 'hobbies' })
    });
    Hobby.toString = () => 'Hobby';

    const Purpose = DS.Model.extend({
      user: DS.belongsTo('user', { inverse: 'purpose' })
    });
    Purpose.toString = () => 'Purpose';

    let store = this.store = createStore({
      user: User,
      Hobby: Hobby,
      purpose: Purpose
    });

    this.relationshipPayloadsManager = new RelationshipPayloadsManager(store);
  }
});

test('_{lhs,rhs}RelationshipIsMany returns true for hasMany relationships', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: null
    },
    hobbies: {
      data: []
    },
    friends: {
      data: []
    }
  });

  let userModel = this.store.modelFor('user');
  let relationshipPayloads =
    this.relationshipPayloadsManager._getRelationshipPayloads(
      'user',
      'friends',
      userModel,
      get(userModel, 'relationshipsByName')
    );

  assert.equal(relationshipPayloads._lhsRelationshipIsMany, true, 'lhsRelationshipIsMany');
  assert.equal(relationshipPayloads._rhsRelationshipIsMany, true, 'rhsRelationshipIsMany');
});

test('_{lhs,rhs}RelationshipIsMany returns false for belongsTo relationships', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: null
    }
  });

  let userModel = this.store.modelFor('user');
  let relationshipPayloads =
    this.relationshipPayloadsManager._getRelationshipPayloads(
      'user',
      'purpose',
      userModel,
      get(userModel, 'relationshipsByName')
    );

  assert.equal(relationshipPayloads._lhsRelationshipIsMany, false, 'purpose:user !isMany');
  assert.equal(relationshipPayloads._rhsRelationshipIsMany, false, 'user:purpose !isMany');
});

testInDebug('get asserts the passed modelName and relationshipName refer to this relationship', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: null
    }
  });

  let userModel = this.store.modelFor('user');
  let relationshipPayloads =
    this.relationshipPayloadsManager._getRelationshipPayloads(
      'user',
      'purpose',
      userModel,
      get(userModel, 'relationshipsByName')
    );

  assert.expectAssertion(() => {
    // relationship is wrong, lhs
    relationshipPayloads.get('user', 1, 'favouriteFood');
  }, 'user:favouriteFood is not either side of this relationship, user:purpose<->purpose:user');

  assert.expectAssertion(() => {
    // relationship is wrong, rhs
    relationshipPayloads.get('purpose', 1, 'fork');
  }, 'purpose:fork is not either side of this relationship, user:purpose<->purpose:user');

  assert.expectAssertion(() => {
    // model doesn't match either side of the relationship
    relationshipPayloads.get('brand-of-catnip', 1, 'purpose');
  }, 'brand-of-catnip:purpose is not either side of this relationship, user:purpose<->purpose:user');
});

testInDebug('unload asserts the passed modelName and relationshipName refer to this relationship', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: null
    }
  });

  let userModel = this.store.modelFor('user');
  let relationshipPayloads =
    this.relationshipPayloadsManager._getRelationshipPayloads(
      'user',
      'purpose',
      userModel,
      get(userModel, 'relationshipsByName')
    );

  assert.expectAssertion(() => {
    // relationship is wrong, lhs
    relationshipPayloads.unload('user', 1, 'favouriteFood');
  }, 'user:favouriteFood is not either side of this relationship, user:purpose<->purpose:user');

  assert.expectAssertion(() => {
    // relationship is wrong, rhs
    relationshipPayloads.unload('purpose', 1, 'fork');
  }, 'purpose:fork is not either side of this relationship, user:purpose<->purpose:user');

  assert.expectAssertion(() => {
    // model doesn't match either side of the relationship
    relationshipPayloads.unload('brand-of-catnip', 1, 'purpose');
  }, 'brand-of-catnip:purpose is not either side of this relationship, user:purpose<->purpose:user');
});

