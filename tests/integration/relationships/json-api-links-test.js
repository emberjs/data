import { run } from '@ember/runloop';
import { get } from '@ember/object';
import Ember from 'ember';
import { resolve } from 'rsvp';
import setupStore from 'dummy/tests/helpers/store';
import {
  reset as resetModelFactoryInjection
} from 'dummy/tests/helpers/model-factory-injection';
import { module, test, todo } from 'qunit';
import DS from 'ember-data';
import JSONAPIAdapter from "ember-data/adapters/json-api";

const { copy } = Ember;
const { Model, attr, hasMany, belongsTo } = DS;

let env, User, Organisation;

module("integration/relationship/json-api-links | Relationship state updates", {
  beforeEach() {},

  afterEach() {
    resetModelFactoryInjection();
    run(env.container, 'destroy');
  }
});

test("Loading link with inverse:null on other model caches the two ends separately", function (assert) {
  User = DS.Model.extend({
    organisation: belongsTo('organisation', { inverse: null })
  });

  Organisation = DS.Model.extend({
    adminUsers: hasMany('user')
  });

  env = setupStore({
    user: User,
    organisation: Organisation
  });

  env.registry.optionsForType('serializer', { singleton: false });
  env.registry.optionsForType('adapter', { singleton: false });

  const store = env.store;

  User = store.modelFor('user');
  Organisation = store.modelFor('organisation');

  env.registry.register('adapter:user', DS.JSONAPISerializer.extend({
    findRecord(store, type, id) {
      return resolve({
        data: {
          id,
          type: 'user',
          relationships: {
            organisation: {
              data: { id: 1, type: 'organisation' }
            }
          }
        }
      });
    }
  }));

  env.registry.register('adapter:organisation', DS.JSONAPISerializer.extend({
    findRecord(store, type, id) {
      return resolve({
        data: {
          type: 'organisation',
          id,
          relationships: {
            'admin-users': {
              links: {
                related: '/org-admins'
              }
            }
          }
        }
      });
    }
  }));

  return run(() => {
    return store.findRecord('user', 1)
      .then(user1 => {
        assert.ok(user1, 'user should be populated');

        return store.findRecord('organisation', 2)
          .then(org2FromFind => {
            assert.equal(user1.belongsTo('organisation').remoteType(), 'id', `user's belongsTo is based on id`);
            assert.equal(user1.belongsTo('organisation').id(), 1, `user's belongsTo has its id populated`);

            return user1.get('organisation')
              .then(orgFromUser => {
                assert.equal(user1.belongsTo('organisation').belongsToRelationship.hasLoaded, true, 'user should have loaded its belongsTo relationship');

                assert.ok(org2FromFind, 'organisation we found should be populated');
                assert.ok(orgFromUser, 'user\'s organisation should be populated');
              })
          })
      })
  });
});

test("Pushing child record should not mark parent:children as loaded", function (assert) {
  let Child = DS.Model.extend({
    parent: belongsTo('parent', { inverse: 'children' })
  });

  let Parent = DS.Model.extend({
    children: hasMany('child')
  });

  env = setupStore({
    parent: Parent,
    child: Child
  });

  env.registry.optionsForType('serializer', { singleton: false });
  env.registry.optionsForType('adapter', { singleton: false });

  const store = env.store;

  Parent = store.modelFor('parent');
  Child = store.modelFor('child');

  return run(() => {
    const parent = store.push({
      data: {
        id: 'p1',
        type: 'parent',
        relationships: {
          children: {
            links: {
              related: '/parent/1/children'
            }
          }
        }
      }
    });

    store.push({
      data: {
        id: 'c1',
        type: 'child',
        relationships: {
          parent: {
            data: {
              id: 'p1',
              type: 'parent'
            }
          }
        }
      }
    });

    assert.equal(parent.hasMany('children').hasManyRelationship.hasLoaded, false, 'parent should think that children still needs to be loaded');
  });
});

test("pushing has-many payloads with data (no links), then more data (no links) works as expected", function(assert) {
  const User = Model.extend({
    pets: hasMany('pet', { async: true, inverse: 'owner' })
  });
  const Pet = Model.extend({
    owner: belongsTo('user', { async: false, inverse: 'pets' })
  });
  const Adapter = JSONAPIAdapter.extend({
    findHasMany() {
      assert.ok(false, 'We dont fetch a link when we havent given a link');
    },
    findMany() {
      assert.ok(false, 'adapter findMany called instead of using findRecord');
    },
    findRecord(_, __, id) {
      assert.ok(id !== '1', `adapter findRecord called for all IDs except "1", called for "${id}"`);
      return resolve({
        data: {
          type: 'pet',
          id,
          relationships: {
            owner: {
              data: { type: 'user', id: '1' }
            }
          }
        }
      });
    }
  });

  env = setupStore({
    adapter: Adapter,
    user: User,
    pet: Pet
  });

  let { store } = env;

  // push data, no links
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        }
      }
    }
  }));

  // push links, no data
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '2' },
            { type: 'pet', id: '3' }
          ]
        }
      }
    }
  }));

  let Chris = run(() => store.peekRecord('user', '1'));
  run(() => get(Chris, 'pets'));
});

test("pushing has-many payloads with data (no links), then links (no data) works as expected", function(assert) {
  const User = Model.extend({
    pets: hasMany('pet', { async: true, inverse: 'owner' })
  });
  const Pet = Model.extend({
    owner: belongsTo('user', { async: false, inverse: 'pets' })
  });
  const Adapter = JSONAPIAdapter.extend({
    findHasMany(_, __, link) {
      assert.ok(link === './user/1/pets', 'We fetched via the correct link');
      return resolve({
        data: [
          {
            type: 'pet',
            id: '1',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          },
          {
            type: 'pet',
            id: '2',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          }
        ]
      });
    },
    findMany() {
      assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
    },
    findRecord() {
      assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
    }
  });

  env = setupStore({
    adapter: Adapter,
    user: User,
    pet: Pet
  });

  let { store } = env;

  // push data, no links
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        }
      }
    }
  }));

  // push links, no data
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          links: {
            related: './user/1/pets'
          }
        }
      }
    }
  }));

  let Chris = run(() => store.peekRecord('user', '1'));
  run(() => get(Chris, 'pets'));
});

test("pushing has-many payloads with links (no data), then data (no links) works as expected", function(assert) {
  const User = Model.extend({
    pets: hasMany('pet', { async: true, inverse: 'owner' })
  });
  const Pet = Model.extend({
    owner: belongsTo('user', { async: false, inverse: 'pets' })
  });
  const Adapter = JSONAPIAdapter.extend({
    findHasMany(_, __, link) {
      assert.ok(link === './user/1/pets', 'We fetched via the correct link');
      return resolve({
        data: [
          {
            type: 'pet',
            id: '1',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          },
          {
            type: 'pet',
            id: '2',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          }
        ]
      });
    },
    findMany() {
      assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
    },
    findRecord() {
      assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
    }
  });

  env = setupStore({
    adapter: Adapter,
    user: User,
    pet: Pet
  });

  let { store } = env;

  // push links, no data
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          links: {
            related: './user/1/pets'
          }
        }
      }
    }
  }));

  // push data, no links
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        }
      }
    }
  }));

  let Chris = run(() => store.peekRecord('user', '1'));

  // we expect to still use the link info
  run(() => get(Chris, 'pets'));
});

test("pushing has-many payloads with links, then links again works as expected", function(assert) {
  const User = Model.extend({
    pets: hasMany('pet', { async: true, inverse: 'owner' })
  });
  const Pet = Model.extend({
    owner: belongsTo('user', { async: false, inverse: 'pets' })
  });
  const Adapter = JSONAPIAdapter.extend({
    findHasMany(_, __, link) {
      assert.ok(link === './user/1/pets', 'We fetched via the correct link');
      return resolve({
        data: [
          {
            type: 'pet',
            id: '1',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          },
          {
            type: 'pet',
            id: '2',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          }
        ]
      });
    },
    findMany() {
      assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
    },
    findRecord() {
      assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
    }
  });

  env = setupStore({
    adapter: Adapter,
    user: User,
    pet: Pet
  });

  let { store } = env;

  // push links, no data
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          links: {
            related: './user/1/not-pets'
          }
        }
      }
    }
  }));

  // push data, no links
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          links: {
            related: './user/1/pets'
          }
        }
      }
    }
  }));

  let Chris = run(() => store.peekRecord('user', '1'));

  // we expect to use the link info from the second push
  run(() => get(Chris, 'pets'));
});

test("pushing has-many payloads with links and data works as expected", function(assert) {
  const User = Model.extend({
    pets: hasMany('pet', { async: true, inverse: 'owner' })
  });
  const Pet = Model.extend({
    owner: belongsTo('user', { async: false, inverse: 'pets' })
  });
  const Adapter = JSONAPIAdapter.extend({
    findHasMany(_, __, link) {
      assert.ok(link === './user/1/pets', 'We fetched via the correct link');
      return resolve({
        data: [
          {
            type: 'pet',
            id: '1',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          },
          {
            type: 'pet',
            id: '2',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          }
        ]
      });
    },
    findMany() {
      assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
    },
    findRecord() {
      assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
    }
  });

  env = setupStore({
    adapter: Adapter,
    user: User,
    pet: Pet
  });

  let { store } = env;

  // push data and links
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ],
          links: {
            related: './user/1/pets'
          }
        }
      }
    }
  }));

  let Chris = run(() => store.peekRecord('user', '1'));
  run(() => get(Chris, 'pets'));
});

test("pushing has-many payloads with links, then one with links and data works as expected", function(assert) {
  const User = Model.extend({
    pets: hasMany('pet', { async: true, inverse: 'owner' })
  });
  const Pet = Model.extend({
    owner: belongsTo('user', { async: false, inverse: 'pets' })
  });
  const Adapter = JSONAPIAdapter.extend({
    findHasMany(_, __, link) {
      assert.ok(link === './user/1/pets', 'We fetched via the correct link');
      return resolve({
        data: [
          {
            type: 'pet',
            id: '1',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          },
          {
            type: 'pet',
            id: '2',
            relationships: {
              owner: {
                data: { type: 'user', id: '1' }
              }
            }
          }
        ]
      });
    },
    findMany() {
      assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
    },
    findRecord() {
      assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
    }
  });

  env = setupStore({
    adapter: Adapter,
    user: User,
    pet: Pet
  });

  let { store } = env;

  // push data, no links
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        }
      }
    }
  }));

  // push links and data
  run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' },
            { type: 'pet', id: '2' },
            { type: 'pet', id: '3' }
          ],
          links: {
            related: './user/1/pets'
          }
        }
      }
    }
  }));

  let Chris = run(() => store.peekRecord('user', '1'));
  run(() => get(Chris, 'pets'));
});

module("integration/relationship/json-api-links | Relationship fetching", {
  beforeEach() {
    const User = Model.extend({
      name: attr(),
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
      home: belongsTo('home', { async: true, inverse: 'owner' })
    });
    const Home = Model.extend({
      address: attr(),
      owner: belongsTo('user', { async: false, inverse: 'home' })
    });
    const Pet = Model.extend({
      name: attr(),
      owner: belongsTo('user', { async: false, inverse: 'pets' })
    });
    const Adapter = JSONAPIAdapter.extend();

    env = setupStore({
      adapter: Adapter,
      user: User,
      pet: Pet,
      home: Home
    });
  },

  afterEach() {
    resetModelFactoryInjection();
    run(env.container, 'destroy');
    env = null;
  }
});

/*
Tests:

Fetches Link
- get/reload hasMany with a link (no data)
- get/reload hasMany with a link and data (not available in store)
- get/reload hasMany with a link and empty data (`data: []`)

Uses Link for Reload
- get/reload hasMany with a link and data (available in store)

Does Not Use Link (as there is none)
- get/reload hasMany with data, no links
- get/reload hasMany with no data, no links
*/

/*
  Used for situations when even initially we should fetch via link
 */
function shouldFetchLinkTests(description, payloads) {
  test(`get+reload hasMany with ${description}`, function(assert) {
    assert.expect(3);
    let { store, adapter } = env;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = (_, __, link) => {
      assert.ok(
        link === payloads.user.data.relationships.pets.links.related,
        'We fetched the appropriate link'
      );
      return resolve(copy(payloads.pets, true));
    };

    // setup user
    let user = run(() => store.push(copy(payloads.user, true)));
    let pets = run(() => user.get('pets'));

    assert.ok(!!pets, 'We found our pets');

    run(() => pets.reload());
  });
  test(`get+unload+get hasMany with ${description}`, function(assert) {
    assert.expect(3);
    let { store, adapter } = env;

    let petRelationshipData = payloads.user.data.relationships.pets.data;
    let petRelDataWasEmpty = petRelationshipData && petRelationshipData.length === 0;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = (_, __, link) => {
      if (petRelDataWasEmpty) {
        assert.ok(
          link === payloads.user.data.relationships.pets.links.related,
          'We fetched this link even though we really should not have'
        );
      } else {
        assert.ok(
          link === payloads.user.data.relationships.pets.links.related,
          'We fetched the appropriate link'
        );
      }
      return resolve(copy(payloads.pets, true));
    };

    // setup user
    let user = run(() => store.push(copy(payloads.user, true)));
    let pets = run(() => user.get('pets'));

    assert.ok(!!pets, 'We found our pets');

    if (!petRelDataWasEmpty) {
      run(() => pets.objectAt(0).unloadRecord());
      run(() => user.get('pets'));
    } else {
      assert.ok(true, `We cant dirty a relationship we have no knowledge of`);
    }
  });
  test(`get+reload belongsTo with ${description}`, function(assert) {
    assert.expect(3);
    let { store, adapter } = env;

    let homeRelationshipData = payloads.user.data.relationships.home.data;
    let homeRelWasEmpty = homeRelationshipData === null;
    let isInitialFetch = true;
    let didFetchInitially = false;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findBelongsTo = (_, __, link) => {
      if (isInitialFetch && homeRelWasEmpty) {
        assert.ok(false, 'We should not fetch a relationship we believe is empty');
        didFetchInitially = true;
      } else {
        assert.ok(
          link === payloads.user.data.relationships.home.links.related,
          'We fetched the appropriate link'
        );
      }
      return resolve(copy(payloads.home, true));
    };

    // setup user
    let user = run(() => store.push(copy(payloads.user, true)));
    let home = run(() => user.get('home'));

    if (homeRelWasEmpty) {
      assert.ok(!didFetchInitially, 'We did not fetch');
    }

    assert.ok(!!home, 'We found our home');
    isInitialFetch = false;

    run(() => home.reload());
  });
  test(`get+unload+get belongsTo with ${description}`, function(assert) {
    assert.expect(3);
    let { store, adapter } = env;

    let homeRelationshipData = payloads.user.data.relationships.home.data;
    let homeRelWasEmpty = homeRelationshipData === null;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findBelongsTo = (_, __, link) => {
      assert.ok(
        !homeRelWasEmpty &&
        link === payloads.user.data.relationships.home.links.related,
        'We fetched the appropriate link'
      );
      return resolve(copy(payloads.home, true));
    };

    // setup user
    let user = run(() => store.push(copy(payloads.user, true)));
    let home = run(() => user.get('home'));

    assert.ok(!!home, 'We found our home');

    if (!homeRelWasEmpty) {
      run(() => home.then(h => h.unloadRecord()));
      run(() => user.get('home'));
    } else {
      assert.ok(true, `We cant dirty a relationship we have no knowledge of`);
      assert.ok(true, `Nor should we have fetched it.`);
    }
  });
}

shouldFetchLinkTests('a link (no data)', {
  user: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          links: {
            related: './runspired/pets'
          }
        },
        home: {
          links: {
            related: './runspired/address'
          }
        }
      }
    }
  },
  pets: {
    data: [
      {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
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
  },
  home: {
    data: {
      type: 'home',
      id: '1',
      attributes: {
        address: 'Oakland, Ca'
      },
      relationships: {
        owner: {
          data: {
            type: 'user',
            id: '1'
          }
        }
      }
    }
  }
});

shouldFetchLinkTests('a link and data (not available in the store)', {
  user: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          links: {
            related: './runspired/pets'
          },
          data: [
            { type: 'pet', id: '1' }
          ]
        },
        home: {
          links: {
            related: './runspired/address'
          },
          data: { type: 'home', id: '1' }
        }
      }
    }
  },
  pets: {
    data: [
      {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            },
            links: {
              related: './user/1'
            }
          }
        }
      }
    ]
  },
  home: {
    data: {
      type: 'home',
      id: '1',
      attributes: {
        address: 'Oakland, Ca'
      },
      relationships: {
        owner: {
          data: {
            type: 'user',
            id: '1'
          },
          links: {
            related: './user/1'
          }
        }
      }
    }
  }
});

shouldFetchLinkTests('a link and empty data (`data: []` or `data: null`), true inverse unloaded', {
  user: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          links: {
            related: './runspired/pets'
          },
          data: []
        },
        home: {
          links: {
            related: './runspired/address'
          },
          data: null
        }
      }
    }
  },
  pets: {
    data: [
      {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
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
  },
  home: {
    data: {
      type: 'home',
      id: '1',
      attributes: {
        address: 'Oakland, Ca'
      },
      relationships: {
        owner: {
          data: {
            type: 'user',
            id: '1'
          }
        }
      }
    }
  }
});

/*
  Used for situations when initially we have data, but reload/missing data
  situations should be done via link
 */
function shouldReloadWithLinkTests(description, payloads) {
  test(`get+reload hasMany with ${description}`, function(assert) {
    assert.expect(2);
    let { store, adapter } = env;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = (_, __, link) => {
      assert.ok(
        link === payloads.user.data.relationships.pets.links.related,
        'We fetched the appropriate link'
      );
      return resolve(copy(payloads.pets, true));
    };

    // setup user and pets
    let user = run(() => store.push(copy(payloads.user, true)));
    run(() => store.push(copy(payloads.pets, true)));
    let pets = run(() => user.get('pets'));

    assert.ok(!!pets, 'We found our pets');

    run(() => pets.reload());
  });
  test(`get+unload+get hasMany with ${description}`, function(assert) {
    assert.expect(2);
    let { store, adapter } = env;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = (_, __, link) => {
      assert.ok(
        link === payloads.user.data.relationships.pets.links.related,
        'We fetched the appropriate link'
      );
      return resolve(copy(payloads.pets, true));
    };

    // setup user and pets
    let user = run(() => store.push(copy(payloads.user, true)));
    run(() => store.push(copy(payloads.pets, true)));
    let pets = run(() => user.get('pets'));

    assert.ok(!!pets, 'We found our pets');

    run(() => pets.objectAt(0).unloadRecord());
    run(() => user.get('pets'));
  });
  test(`get+reload belongsTo with ${description}`, function(assert) {
    assert.expect(2);
    let { store, adapter } = env;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findBelongsTo = (_, __, link) => {
      assert.ok(
        link === payloads.user.data.relationships.home.links.related,
        'We fetched the appropriate link'
      );
      return resolve(copy(payloads.home, true));
    };

    // setup user and home
    let user = run(() => store.push(copy(payloads.user, true)));
    run(() => store.push(copy(payloads.home, true)));
    let home = run(() => user.get('home'));

    assert.ok(!!home, 'We found our home');

    run(() => home.reload());
  });
  test(`get+unload+get belongsTo with ${description}`, function(assert) {
    assert.expect(2);
    let { store, adapter } = env;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(false, 'We should not call findRecord');
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findBelongsTo = (_, __, link) => {
      assert.ok(
        link === payloads.user.data.relationships.home.links.related,
        'We fetched the appropriate link'
      );
      return resolve(copy(payloads.home, true));
    };

    // setup user
    let user = run(() => store.push(copy(payloads.user, true)));
    run(() => store.push(copy(payloads.home, true)));
    let home;
    run(() => user.get('home').then(h => home = h));

    assert.ok(!!home, 'We found our home');

    run(() => home.unloadRecord());
    run(() => user.get('home'));
  });
}

shouldReloadWithLinkTests('a link and data (available in the store)', {
  user: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          links: {
            related: './runspired/pets'
          },
          data: [
            { type: 'pet', id: '1' }
          ]
        },
        home: {
          links: {
            related: './runspired/address'
          },
          data: { type: 'home', id: '1' }
        }
      }
    }
  },
  pets: {
    data: [
      {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
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
  },
  home: {
    data: {
      type: 'home',
      id: '1',
      attributes: {
        address: 'Oakland, Ca'
      },
      relationships: {
        owner: {
          data: {
            type: 'user',
            id: '1'
          }
        }
      }
    }
  }
});

shouldReloadWithLinkTests('a link and empty data (`data: []` or `data: null`), true inverse loaded', {
  user: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          links: {
            related: './runspired/pets'
          },
          data: []
        },
        home: {
          links: {
            related: './runspired/address'
          },
          data: null
        }
      }
    }
  },
  pets: {
    data: [
      {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            },
            links: {
              related: './user/1'
            }
          }
        }
      }
    ]
  },
  home: {
    data: {
      type: 'home',
      id: '1',
      attributes: {
        address: 'Oakland, Ca'
      },
      relationships: {
        owner: {
          data: {
            type: 'user',
            id: '1'
          },
          links: {
            related: './user/1'
          }
        }
      }
    }
  }
});

/*
  Ad Hoc Situations when we don't have a link
 */

// data, no links
test(`get+reload hasMany with data, no links`, function(assert) {
  assert.expect(3);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };

  // setup user
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        },
        home: {
          data: { type: 'home', id: '1' }
        }
      }
    }
  }));
  let pets = run(() => user.get('pets'));

  assert.ok(!!pets, 'We found our pets');

  run(() => pets.reload());
});
test(`get+unload+get hasMany with data, no links`, function(assert) {
  assert.expect(3);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };

  // setup user
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        },
        home: {
          data: { type: 'home', id: '1' }
        }
      }
    }
  }));
  let pets = run(() => user.get('pets'));

  assert.ok(!!pets, 'We found our pets');

  run(() => pets.objectAt(0).unloadRecord());
  run(() => user.get('pets'));
});
test(`get+reload belongsTo with data, no links`, function(assert) {
  assert.expect(3);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, CA'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };


  // setup user
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        },
        home: {
          data: { type: 'home', id: '1' }
        }
      }
    }
  }));
  let home = run(() => user.get('home'));

  assert.ok(!!home, 'We found our home');

  run(() => home.reload());
});
test(`get+unload+get belongsTo with data, no links`, function(assert) {
  assert.expect(3);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, Ca'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };


  // setup user
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          data: [
            { type: 'pet', id: '1' }
          ]
        },
        home: {
          data: { type: 'home', id: '1' }
        }
      }
    }
  }));
  let home = run(() => user.get('home'));

  assert.ok(!!home, 'We found our home');

  run(() => home.then(h => h.unloadRecord()));
  run(() => user.get('home'));
});

// missing data setup from the other side, no links
test(`get+reload hasMany with missing data setup from the other side, no links`, function(assert) {
  assert.expect(2);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };

  // setup user and pet
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {}
    },
    included: [
      {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
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
  let pets = run(() => user.get('pets'));

  assert.ok(!!pets, 'We found our pets');

  run(() => pets.reload());
});
test(`get+unload+get hasMany with missing data setup from the other side, no links`, function(assert) {
  assert.expect(2);
  let { store, adapter } = env;
  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };

  // setup user and pet
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {}
    },
    included: [
      {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen'
        },
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
  let pets = run(() => user.get('pets'));

  assert.ok(!!pets, 'We found our pets');

  run(() => pets.objectAt(0).unloadRecord());
  run(() => user.get('pets'));
});
test(`get+reload belongsTo with missing data setup from the other side, no links`, function(assert) {
  assert.expect(2);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, CA'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };

  // setup user and home
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {}
    },
    included: [
      {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, CA'
        },
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
  let home = run(() => user.get('home'));

  assert.ok(!!home, 'We found our home');

  run(() => home.reload());
});
test(`get+unload+get belongsTo with missing data setup from the other side, no links`, function(assert) {
  assert.expect(2);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(true, 'We should call findRecord');
    return resolve({
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, CA'
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1'
            }
          }
        }
      }
    });
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };

  // setup user and home
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {}
    },
    included: [
      {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, CA'
        },
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
  let home = run(() => user.get('home'));

  assert.ok(!!home, 'We found our home');

  run(() => home.then(h => h.unloadRecord()));
  run(() => user.get('home'));
});

// empty data, no links
test(`get+reload hasMany with empty data, no links`, function(assert) {
  assert.expect(1);
  let { store, adapter } = env;

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(false, 'We should not call findRecord');
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = () => {
    assert.ok(false, 'We should not call findHasMany');
  };

  // setup user
  let user = run(() => store.push({
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          data: []
        },
        home: {
          data: null
        }
      }
    }
  }));
  let pets = run(() => user.get('pets'));

  assert.ok(!!pets, 'We found our pets');

  run(() => pets.reload());
});

/*
  Ad hoc situations where we do have a link
 */
todo('We should not fetch a hasMany relationship with links that we know is empty', function(assert) {
  assert.expect(1);
  let { store, adapter } = env;

  let user1Payload = {
    data: {
      type: 'user',
        id: '1',
        attributes: {
        name: '@runspired'
      },
      relationships: {
        pets: {
          links: {
            related: './runspired/pets'
          },
          data: [] // we are explicitly told this is empty
        }
      }
    }
  };
  let user2Payload = {
    data: {
      type: 'user',
      id: '2',
      attributes: {
        name: '@hjdivad'
      },
      relationships: {
        pets: {
          links: {
            related: './hjdivad/pets'
          }
          // we have no data, so we do not know that this is empty
        }
      }
    }
  };
  let requestedUser = null;
  let failureDescription = '';

  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.findRecord = () => {
    assert.ok(false, 'We should not call findRecord');
  };
  adapter.findMany = () => {
    assert.ok(false, 'We should not call findMany');
  };
  adapter.findHasMany = (_, __, link) => {
    if (!requestedUser) {
      assert.ok(false, failureDescription);
    } else {
      assert.ok(
        link === requestedUser.data.relationships.pets.links.related,
        'We fetched the appropriate link'
      );
    }

    return resolve({
      data: []
    });
  };

  // setup users
  let user1 = run(() => store.push(copy(user1Payload, true)));
  let user2 = run(() => store.push(copy(user2Payload, true)));

  // should not fire a request
  requestedUser = null;
  failureDescription = 'We fetched the link for a known empty relationship';
  run(() => user1.get('pets'));

  // still should not fire a request
  requestedUser = null;
  failureDescription = 'We fetched the link (again) for a known empty relationship';
  run(() => user1.get('pets'));

  // should fire a request
  requestedUser = user2Payload;
  run(() => user2.get('pets'));

  // should not fire a request
  requestedUser = null;
  failureDescription = 'We fetched the link for a previously fetched and found to be empty relationship';
  run(() => user2.get('pets'));
});
