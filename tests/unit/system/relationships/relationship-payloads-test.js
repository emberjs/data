import { get } from '@ember/object';
import { RelationshipPayloadsManager } from 'ember-data/-private';
import DS from 'ember-data';
import setupStore from 'dummy/tests/helpers/store';
import { module, test, todo } from 'qunit';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { run } from '@ember/runloop';
import {
  reset as resetModelFactoryInjection
} from 'dummy/tests/helpers/model-factory-injection';

const {
  belongsTo,
  hasMany,
  attr,
  Model
} = DS;

module('unit/system/relationships/relationship-payloads', {
  beforeEach() {
    const User = Model.extend({
      purpose: belongsTo('purpose', { inverse: 'user' }),
      hobbies: hasMany('hobby', { inverse: 'user'}),
      friends: hasMany('user', { inverse: 'friends' })
    });
    User.toString = () => 'User';

    const Hobby = Model.extend({
      user: belongsTo('user', { inverse: 'hobbies' })
    });
    Hobby.toString = () => 'Hobby';

    const Purpose = Model.extend({
      user: belongsTo('user', { inverse: 'purpose' })
    });
    Purpose.toString = () => 'Purpose';

    this.env = setupStore({
      user: User,
      Hobby: Hobby,
      purpose: Purpose
    });

    let store = this.env.store;

    this.relationshipPayloadsManager = new RelationshipPayloadsManager(store);
  },

  afterEach() {
    resetModelFactoryInjection();
    run(this.env.container, 'destroy');
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

let env;

module("Unit | Relationship Payloads | Merge Forward Links & Meta", {
  beforeEach() {
    const User = Model.extend({
      name: attr(),
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
      home: belongsTo('home', { async: true, inverse: 'owners' })
    });
    const Home = Model.extend({
      address: attr(),
      owners: hasMany('user', { async: true, inverse: 'home' })
    });
    const Pet = Model.extend({
      name: attr(),
      owner: belongsTo('user', { async: false, inverse: 'pets' })
    });

    this.env = setupStore({
      user: User,
      pet: Pet,
      home: Home
    });

    this.store = this.env.store;
  },

  afterEach() {
    resetModelFactoryInjection();
    run(this.env.container, 'destroy');
  }
});

todo('links and meta for hasMany inverses are not overwritten', function(assert) {
  let { store } = this;

  // user:1 with pet:1 pet:2 and home:1 and links and meta for both
  let user1 = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: { name: '@runspired ' },
      relationships: {
        home: {
          links: {
            related: './runspired/home'
          },
          data: {
            type: 'home',
            id: '1'
          },
          meta: {
            slogan: 'home is where the <3 emoji is'
          }
        },
        pets: {
          links: {
            related: './runspired/pets'
          },
          data: [
            { type: 'pet', id: '1' },
            { type: 'pet', id: '2' }
          ],
          meta: {
            slogan: 'catz rewl rawr'
          }
        }
      }
    }
  }));

  // home:1 with user:1 user:2 and links and meta
  // user:2 sideloaded to prevent needing to fetch
  let home1 = run(() => store.push({
    data: {
      type: 'home',
      id: '1',
      attributes: { address: 'Oakland, CA' },
      relationships: {
        owners: {
          links: {
            related: './home/1/owners'
          },
          data: [
            { type: 'user', id: '2' },
            { type: 'user', id: '1' }
          ],
          meta: {
            slogan: 'what is woof?'
          }
        }
      }
    },
    included: [
      {
        type: 'user',
        id: '2',
        attribute: { name: '@hjdivad' },
        relationships: {
          home: {
            data: { type: 'home', id: '1' }
          }
        }
      }
    ]
  }));

  // Toss a couple of pets in for good measure
  run(() => store.push({
    data: [
      {
        type: 'pet',
        id:'1',
        attributes: { name: 'Shen' },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      },
      {
        type: 'pet',
        id:'2',
        attributes: { name: 'Rambo' },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    ]
  }));

  let user1home = run(() => user1.get('home'));
  let user1pets = run(() => user1.get('pets'));
  let home1owners = run(() => home1.get('owners'));

  // we currently proxy meta, but not links
  assert.equal(
    user1home.get('meta'),
    {
      slogan: 'home is where the <3 emoji is'
    },
    `We merged forward meta for user 1's home`
  );
  assert.equal(
    home1owners.get('meta'),
    {
      slogan: 'what is woof?'
    },
    `We merged forward meta for home 1's owners`
  );
  assert.equal(
    user1pets.get('meta'),
    {
      slogan: 'catz rewl rawr'
    },
    `We merged forward meta for user 1's pets`
  );

  // check the link as best we can
  assert.equal(
    user1.belongsTo('home').belongsToRelationship.link,
    './runspired/home',
    `We merged forward links for user 1's home`
  );
  assert.equal(
    user1.hasMany('pets').hasManyRelationship.link,
    './runspired/pets',
    `We merged forward links for user 1's pets`
  );
  assert.equal(
    home1.hasMany('owners').hasManyRelationship.link,
    './home/1/owners',
    `We merged forward links for home 1's owners`
  );
});
