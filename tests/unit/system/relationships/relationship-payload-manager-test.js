import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { copy } from '@ember/object/internals';
import { RelationshipPayloadsManager } from 'ember-data/-private';
import DS from 'ember-data';
import { createStore } from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';

const { Model, hasMany, belongsTo, attr } = DS;

let id = 1;

function makeHat(type, props) {
  const resource = copy(props, true);
  resource.id = `${id++}`;
  resource.type = type;
  resource.attributes.type = type;
  return resource;
}

module('unit/system/relationships/relationship-payloads-manager', {
  beforeEach() {
    const User = DS.Model.extend({
      purpose: DS.belongsTo('purpose', { inverse: 'user' }),
      hobbies: DS.hasMany('hobby', { inverse: 'user'}),
      friends: DS.hasMany('user', { inverse: 'friends' }),
      hats: hasMany('hat', { async: false, polymorphic: true, inverse: 'user' })
    });
    User.toString = () => 'User';

    const Alien = User.extend({});
    Alien.toString = () => 'Alien';

    const Hobby = DS.Model.extend({
      user: DS.belongsTo('user', { inverse: 'hobbies' })
    });
    Hobby.toString = () => 'Hobby';

    const Purpose = DS.Model.extend({
      user: DS.belongsTo('user', { inverse: 'purpose' })
    });
    Purpose.toString = () => 'Purpose';

    const Hat = Model.extend({
      type: attr('string'),
      user: belongsTo('user', { async: false, inverse: 'hats', polymorphic: true })
    });
    const BigHat = Hat.extend({});
    const SmallHat = Hat.extend({});

    let store = this.store = createStore({
      user: User,
      alien: Alien,
      Hobby: Hobby,
      purpose: Purpose,
      hat: Hat,
      bigHat: BigHat,
      smallHat: SmallHat
    });

    this.relationshipPayloadsManager = new RelationshipPayloadsManager(store);
  }
});


test('get throws for invalid models', function(assert) {
  this.relationshipPayloadsManager._store._modelFor = (name) => {
    if (name === 'fish') {
      throw new Error('What is fish?');
    }
  };

  assert.throws(() => {
    this.relationshipPayloadsManager.get('fish', 9, 'hobbies');
  }, /What is fish/);
});

test('get returns null for invalid relationships', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: {
      data: [{
        id: 1,
        type: 'hobby'
      }]
    }
  });
  let entry = this.relationshipPayloadsManager.get('user', 2, 'potatoes');
  assert.equal(entry, null, 'nothing returned for invalid relationship');
});

test('get returns null if there are no payloads', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: {
      data: [{
        id: 1,
        type: 'hobby'
      }]
    }
  });
  let entry = this.relationshipPayloadsManager.get('user', 2, 'hobbies');
  assert.equal(entry, null, 'no payloads for user 2');

  entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.equal(entry, null, 'no payloads for user 1 purpose');
});

test('get returns direct payloads', function(assert) {
  let hobbyPayload = {
    data: [{
      id: 1,
      type: 'hobby'
    }]
  };
  let purposePayload = {
    data: {
      id: 2,
      type: 'purpose'
    }
  };
  let friendsPayload = {
    data: [{
      id: 2,
      type: 'user'
    }, {
      id: 3,
      type: 'user'
    }]
  };
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: hobbyPayload,
    purpose: purposePayload,
    friends: friendsPayload
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, purposePayload, 'direct one-to-one payload loaded');

  entry = this.relationshipPayloadsManager.get('user', 1, 'hobbies');
  assert.deepEqual(entry, hobbyPayload, 'direct one-to-many payload loaded');

  entry = this.relationshipPayloadsManager.get('user', 1, 'friends');
  assert.deepEqual(entry, friendsPayload, 'direct many-to-many payload loaded');
});

test('get returns inverse payloads one-to-one', function(assert) {
  this.relationshipPayloadsManager.push('purpose', 2, {
    user: {
      data: {
        id: 1,
        type: 'user'
      }
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 2,
      type: 'purpose'
    }
  }, 'inverse one-to-one payload loaded');
});

test('get returns inverse payloads one-to-many', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: {
      data: [{
        id: 2,
        type: 'hobby'
      }, {
        id: 3,
        type: 'hobby'
      }]
    }
  });

  let entry = this.relationshipPayloadsManager.get('hobby', 2, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'inverse one-to-many payload loaded');

  entry = this.relationshipPayloadsManager.get('hobby', 3, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'inverse one-to-many payload loaded');
});

test('get handles inverse payloads that unset one-to-one', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: {
        id: 2,
        type: 'purpose'
      }
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 2,
      type: 'purpose'
    }
  }, 'user.purpose.id is initially 2');

  entry = this.relationshipPayloadsManager.get('purpose', 2, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'purpose.user.id is initially 1');

  this.relationshipPayloadsManager.push('purpose', 2, {
    user: {
      data: null
    }
  });

  entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: null
  }, 'inverse payload unset one-to-one');
});

test('get handles inverse payloads that change one-to-one', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: {
        id: 2,
        type: 'purpose'
      }
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 2,
      type: 'purpose'
    }
  }, 'user.purpose.id is initially 2');

  entry = this.relationshipPayloadsManager.get('purpose', 2, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'purpose.user.id is initially 1');

  this.relationshipPayloadsManager.push('purpose', 2, {
    user: {
      data: {
        id: 2,
        type: 'user'
      }
    }
  });

  entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: null
  }, 'inverse payload unset one-to-one');

  entry = this.relationshipPayloadsManager.get('user', 2, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 2,
      type: 'purpose'
    }
  }, 'inverse payload changed one-to-one');
});

test('get handles inverse payloads that remove one-to-many', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: {
      data: [{
        id: 2,
        type: 'hobby'
      }, {
        id: 3,
        type: 'hobby'
      }]
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'hobbies');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'hobby'
    }, {
      id: 3,
      type: 'hobby'
    }]
  }, 'user.hobbies.ids is initially 2,3');

  entry = this.relationshipPayloadsManager.get('hobby', 2, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'hobby(2).user.id is initially 1');

  entry = this.relationshipPayloadsManager.get('hobby', 3, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'hobby(3).user.id is initially 1');

  this.relationshipPayloadsManager.push('hobby', 2, {
    user: {
      data: null
    }
  });

  entry = this.relationshipPayloadsManager.get('user', 1, 'hobbies');
  assert.deepEqual(entry, {
    data: [{
      id: 3,
      type: 'hobby'
    }]
  }, 'inverse payload removes from one-to-many');
});

test('get handles inverse payloads that add one-to-many', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: {
      data: [{
        id: 2,
        type: 'hobby'
      }, {
        id: 3,
        type: 'hobby'
      }]
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'hobbies');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'hobby'
    }, {
      id: 3,
      type: 'hobby'
    }]
  }, 'user.hobbies.ids is initially 2,3');

  entry = this.relationshipPayloadsManager.get('hobby', 2, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'hobby(2).user.id is initially 1');

  entry = this.relationshipPayloadsManager.get('hobby', 3, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'hobby(3).user.id is initially 1');

  this.relationshipPayloadsManager.push('hobby', 4, {
    user: {
      data: {
        id: 1,
        type: 'user'
      }
    }
  });

  entry = this.relationshipPayloadsManager.get('user', 1, 'hobbies');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'hobby'
    }, {
      id: 3,
      type: 'hobby'
    }, {
      id: 4,
      type: 'hobby'
    }]
  }, 'inverse payload adds to one-to-many');
});

test('get handles inverse payloads that remove many-to-many', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    friends: {
      data: [{
        id: 2,
        type: 'user'
      }, {
        id: 3,
        type: 'user'
      }]
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'friends');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'user'
    }, {
      id: 3,
      type: 'user'
    }]
  }, 'user.friends.ids is initially 2,3');

  this.relationshipPayloadsManager.push('user', 3, {
    friends: {
      data: []
    }
  });

  entry = this.relationshipPayloadsManager.get('user', 1, 'friends');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'user'
    }]
  }, 'inverse payload removes from many-to-many');
});

test('get handles inverse payloads that add many-to-many', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    friends: {
      data: [{
        id: 2,
        type: 'user'
      }, {
        id: 3,
        type: 'user'
      }]
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'friends');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'user'
    }, {
      id: 3,
      type: 'user'
    }]
  }, 'user.friends.ids is initially 2,3');

  this.relationshipPayloadsManager.push('user', 4, {
    friends: {
      data: [{
        id: 1,
        type: 'user'
      }]
    }
  });

  entry = this.relationshipPayloadsManager.get('user', 1, 'friends');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'user'
    }, {
      id: 3,
      type: 'user'
    }, {
      id: 4,
      type: 'user'
    }]
  }, 'inverse payload adds to many-to-many');
});

test('push populates the same RelationshipPayloads for either side of a relationship', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: [{
      id: 2,
      type: 'hobby'
    }]
  });

  let userModel = this.store.modelFor('user');

  let userPayloads =
    this.relationshipPayloadsManager._getRelationshipPayloads(
      'user',
      'hobbies',
      userModel,
      get(userModel, 'relationshipsByName')
    );

  let hobbyModel = this.store.modelFor('hobby');
  let hobbyPayloads =
    this.relationshipPayloadsManager._getRelationshipPayloads(
      'hobby',
      'user',
      hobbyModel,
      get(hobbyModel, 'relationshipsByName')
    );

  assert.equal(userPayloads, hobbyPayloads, 'both sides of a relationship share a RelationshipPayloads');
});

test('push does not eagerly populate inverse payloads', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    hobbies: {
      data: [{
        id: 2,
        type: 'hobby'
      }]
    }
  });

  let userModel = this.store.modelFor('user');
  let relationshipPayloads =
    this.relationshipPayloadsManager._getRelationshipPayloads(
      'user',
      'hobbies',
      userModel,
      get(userModel, 'relationshipsByName')
    );

  assert.deepEqual(
    Object.keys(relationshipPayloads._lhsPayloads),
    [] ,
    'user.hobbies payloads not eagerly populated'
  );
  assert.deepEqual(
    Object.keys(relationshipPayloads._rhsPayloads),
    [] ,
    'hobby.user payloads not eagerly populated'
  );

  relationshipPayloads.get('user', 1, 'hobbies');

  assert.deepEqual(
    Object.keys(relationshipPayloads._lhsPayloads),
    ['1'] ,
    'user.hobbies payloads lazily populated'
  );
  assert.deepEqual(
    Object.keys(relationshipPayloads._rhsPayloads),
    ['2'] ,
    'hobby.user payloads lazily populated'
  );
});

test('push populates each individual relationship in a payload', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: {
        id: 3,
        type: 'purpose'
      }
    },
    friends: {
      data: [{
        id: 3,
        type: 'user'
      }]
    },
    hobbies: {
      data: [{
        id: 2,
        type: 'hobby'
      }]
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 3,
      type: 'purpose'
    }
  }, 'user.purpose is loaded');

  entry = this.relationshipPayloadsManager.get('user', 1, 'friends');
  assert.deepEqual(entry, {
    data: [{
      id: 3,
      type: 'user'
    }]
  }, 'user.friends is loaded');

  entry = this.relationshipPayloadsManager.get('user', 1, 'hobbies');
  assert.deepEqual(entry, {
    data: [{
      id: 2,
      type: 'hobby'
    }]
  }, 'user.hobbies is loaded');
});

test('push ignores invalid relationships in a payload', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: {
        id: 3,
        type: 'purpose'
      }
    },
    loyalBadgers: {
      data: [{
        id: 1,
        type: 'badger-obviously'
      }, {
        id: 2,
        type: 'badger-obviously'
      }]
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 3,
      type: 'purpose'
    }
  }, 'user.purpose is loaded');
});

test('unload unloads payloads that have no inverse', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: {
        id: 1,
        type: 'purpose'
      }
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'purpose'
    }
  }, 'payload is initially loaded');

  this.relationshipPayloadsManager.unload('user', 1, 'purpose');

  entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.equal(entry, null, 'payload is unloaded when inverse is not in store');
});

test('unload unloads only one side of the payload when it has an inverse', function(assert) {
  this.relationshipPayloadsManager.push('user', 1, {
    purpose: {
      data: {
        id: 1,
        type: 'purpose'
      }
    }
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'purpose'
    }
  }, 'payload is initially loaded');

  this.relationshipPayloadsManager.unload('user', 1, 'purpose');

  entry = this.relationshipPayloadsManager.get('user', 1, 'purpose');
  assert.equal(null, entry, 'payload is unloaded');

  entry = this.relationshipPayloadsManager.get('purpose', 1, 'user');
  assert.deepEqual(entry, {
    data: {
      id: 1,
      type: 'user'
    }
  }, 'inverse is retained');
});

test('get can retrieve payloads with self-links in reflexive relationships', function(assert) {
  let friendsPayload = {
    data: [{
      id: 1,
      type: 'user'
    }]
  };
  this.relationshipPayloadsManager.push('user', 1, {
    friends: friendsPayload
  });

  let entry = this.relationshipPayloadsManager.get('user', 1, 'friends');
  assert.deepEqual(entry, friendsPayload, 'self-link in reflexive relationship');
});

test('push one side is polymorphic, baseType then subTypes', function(assert) {
  const hatData = {
    attributes: {},
    relationships: {
      user: {
        data: { id: '1' , type: 'user' }
      }
    }
  };

  const hatData1 = makeHat('hat', hatData),
    bigHatData1 = makeHat('big-hat', hatData),
    smallHatData1 = makeHat('small-hat', hatData);

  const userData = {
    data: {
      id: '1',
      type: 'user',
      attributes: {}
    },
    included: [
      hatData1,
      bigHatData1,
      smallHatData1
    ]
  };

  const user = run(() => this.store.push(userData));

  const finalResult = user.get('hats').mapBy('type');

  assert.deepEqual(finalResult, ['hat', 'big-hat', 'small-hat'], 'We got all our hats!');
});

test('push one side is polymorphic, subType then baseType', function(assert) {
  const hatData = {
    attributes: {},
    relationships: {
      user: {
        data: { id: '1' , type: 'user' }
      }
    }
  };

  const bigHatData1 = makeHat('hat', hatData),
    smallHatData1 = makeHat('small-hat', hatData),
    hatData1 = makeHat('big-hat', hatData),
    included = [bigHatData1, smallHatData1, hatData1];

  const userData = {
    data: {
      id: '1',
      type: 'user',
      attributes: {}
    },
    included
  };

  const user = run(() => this.store.push(userData)),
    finalResult = user.get('hats').mapBy('type'),
    expectedResults = included.map(m=>m.type);

  assert.deepEqual(finalResult, expectedResults, 'We got all our hats!');
});

test('push one side is polymorphic, different subtypes', function(assert) {
  const hatData = {
    attributes:{},
    relationships: {
      user: {
        data: { id: '1' , type: 'user' }
      }
    }
  };

  const bigHatData1 = makeHat('big-hat', hatData),
    smallHatData1 = makeHat('small-hat', hatData),
    bigHatData2 = makeHat('big-hat', hatData),
    smallHatData2 = makeHat('small-hat', hatData),
    included = [
      bigHatData1,
      smallHatData1,
      bigHatData2,
      smallHatData2
    ];

  const userData = {
    data: {
      id: '1',
      type: 'user',
      attributes: {}
    },
    included
  };

  const user = run(() => this.store.push(userData)),
    finalResult = user.get('hats').mapBy('type'),
    expectedResults = included.map(m => m.type);

  assert.deepEqual(finalResult, expectedResults, 'We got all our hats!');
});

test('push both sides are polymorphic', function(assert) {
  const alienHatData = {
    attributes: {},
    relationships: {
      user: {
        data: { id: '1' , type: 'alien' }
      }
    }
  };

  const bigHatData1 = makeHat('hat', alienHatData),
    hatData1 = makeHat('big-hat', alienHatData),
    alienIncluded = [bigHatData1, hatData1];

  const alienData = {
    data: {
      id: '1',
      type: 'alien',
      attributes: {}
    },
    included: alienIncluded
  };

  const expectedAlienResults = alienIncluded.map(m => m.type),
    alien = run(() => this.store.push(alienData)),
    alienFinalHats = alien.get('hats').mapBy('type');

  assert.deepEqual(alienFinalHats, expectedAlienResults, 'We got all alien hats!');
});

test('handles relationships where both sides are polymorphic', function(assert) {
  let id = 1;
  function makeHat(type, isForBigPerson = true) {
    return {
      id: `${id++}`,
      type,
      relationships: {
        person: {
          data: {
            id: isForBigPerson ? '1' : '2',
            type: isForBigPerson ? 'big-person' : 'small-person'
          }
        }
      }
    };
  }

  const bigHatData1 = makeHat('big-hat');
  const bigHatData2 = makeHat('big-hat');
  const bigHatData3 = makeHat('big-hat', false);
  const smallHatData1 = makeHat('small-hat');
  const smallHatData2 = makeHat('small-hat');
  const smallHatData3 = makeHat('small-hat', false);

  const bigPersonData = {
    data: {
      id: '1',
      type: 'big-person',
      attributes: {}
    },
    included: [
      bigHatData1,
      smallHatData1,
      bigHatData2,
      smallHatData2
    ]
  };

  const smallPersonData = {
    data: {
      id: '2',
      type: 'small-person',
      attributes: {}
    },
    included: [
      bigHatData3,
      smallHatData3
    ]
  };

  const PersonModel = Model.extend({
    hats: hasMany('hat', {
      async: false,
      polymorphic: true,
      inverse: 'person'
    })
  });
  const HatModel = Model.extend({
    type: attr('string'),
    person: belongsTo('person', {
      async: false,
      inverse: 'hats',
      polymorphic: true
    })
  });
  const BigHatModel = HatModel.extend({});
  const SmallHatModel = HatModel.extend({});

  const BigPersonModel = PersonModel.extend({});
  const SmallPersonModel = PersonModel.extend({});

  const store = this.store = createStore({
    person: PersonModel,
    bigPerson: BigPersonModel,
    smallPerson: SmallPersonModel,
    hat: HatModel,
    bigHat: BigHatModel,
    smallHat: SmallHatModel
  });

  const bigPerson = run(() => {
    return store.push(bigPersonData);
  });

  const smallPerson = run(() => {
    return store.push(smallPersonData);
  });

  const finalBigResult = bigPerson.get('hats').toArray();
  const finalSmallResult = smallPerson.get('hats').toArray();

  assert.equal(finalBigResult.length, 4, 'We got all our hats!');
  assert.equal(finalSmallResult.length, 2, 'We got all our hats!');
});
