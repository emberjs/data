import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';

module('integration/relationship/json-api-links | Relationship state updates', function (hooks) {
  setupTest(hooks);

  test('Loading link with inverse:null on other model caches the two ends separately', function (assert) {
    const User = Model.extend({
      organisation: belongsTo('organisation', { async: true, inverse: null }),
    });

    const Organisation = Model.extend({
      adminUsers: hasMany('user', { async: true, inverse: null }),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:organisation', Organisation);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    this.owner.register(
      'adapter:user',
      class extends JSONAPISerializer {
        findRecord(store, type, id) {
          return resolve({
            data: {
              id,
              type: 'user',
              relationships: {
                organisation: {
                  data: { id: '1', type: 'organisation' },
                },
              },
            },
          });
        }
      }
    );

    this.owner.register(
      'adapter:organisation',
      class extends JSONAPISerializer {
        findRecord(store, type, id) {
          return resolve({
            data: {
              type: 'organisation',
              id,
              relationships: {
                'admin-users': {
                  links: {
                    related: '/org-admins',
                  },
                },
              },
            },
          });
        }
      }
    );

    return run(() => {
      return store.findRecord('user', 1).then((user1) => {
        assert.ok(user1, 'user should be populated');

        return store.findRecord('organisation', 2).then((org2FromFind) => {
          assert.strictEqual(user1.belongsTo('organisation').remoteType(), 'id', `user's belongsTo is based on id`);
          assert.strictEqual(user1.belongsTo('organisation').id(), '1', `user's belongsTo has its id populated`);

          return user1.organisation.then((orgFromUser) => {
            assert.false(
              user1.belongsTo('organisation').belongsToRelationship.state.isStale,
              'user should have loaded its belongsTo relationship'
            );

            assert.ok(org2FromFind, 'organisation we found should be populated');
            assert.ok(orgFromUser, "user's organisation should be populated");
          });
        });
      });
    });
  });

  test('Pushing child record should not mark parent:children as loaded', function (assert) {
    const Child = Model.extend({
      parent: belongsTo('parent', { async: true, inverse: 'children' }),
    });

    const Parent = Model.extend({
      children: hasMany('child', { async: true, inverse: 'parent' }),
    });

    this.owner.register('model:child', Child);
    this.owner.register('model:parent', Parent);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    const parent = store.push({
      data: {
        id: 'p1',
        type: 'parent',
        relationships: {
          children: {
            links: {
              related: '/parent/1/children',
            },
          },
        },
      },
    });

    const state = parent.hasMany('children').hasManyRelationship.state;
    assert.true(state.isStale, 'initial: parent should think that children still needs to be loaded');

    store.push({
      data: {
        id: 'c1',
        type: 'child',
        relationships: {
          parent: {
            data: {
              id: 'p1',
              type: 'parent',
            },
          },
        },
      },
    });

    assert.true(state.isStale, 'final: parent should think that children still needs to be loaded');
  });

  test('pushing has-many payloads with data (no links), then more data (no links) works as expected', function (assert) {
    const User = Model.extend({
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
    });
    const Pet = Model.extend({
      owner: belongsTo('user', { async: false, inverse: 'pets' }),
    });
    const Adapter = JSONAPIAdapter.extend({
      findHasMany() {
        assert.ok(false, 'We dont fetch a link when we havent given a link');
      },
      findMany() {
        assert.ok(false, 'adapter findMany called instead of using findRecord');
      },
      findRecord(_, __, id) {
        assert.notStrictEqual(id, '1', `adapter findRecord called for all IDs except "1", called for "${id}"`);
        return resolve({
          data: {
            type: 'pet',
            id,
            relationships: {
              owner: {
                data: { type: 'user', id: '1' },
              },
            },
          },
        });
      },
    });

    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);

    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    // push data, no links
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
          },
        },
      })
    );

    // push links, no data
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              data: [
                { type: 'pet', id: '2' },
                { type: 'pet', id: '3' },
              ],
            },
          },
        },
      })
    );

    let Chris = run(() => store.peekRecord('user', '1'));
    run(() => get(Chris, 'pets'));
  });

  test('pushing has-many payloads with data (no links), then links (no data) works as expected', function (assert) {
    const User = Model.extend({
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
    });
    const Pet = Model.extend({
      owner: belongsTo('user', { async: false, inverse: 'pets' }),
    });
    const Adapter = JSONAPIAdapter.extend({
      findHasMany(_, __, link) {
        assert.strictEqual(link, './user/1/pets', 'We fetched via the correct link');
        return resolve({
          data: [
            {
              type: 'pet',
              id: '1',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
            {
              type: 'pet',
              id: '2',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
          ],
        });
      },
      findMany() {
        assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
      },
      findRecord() {
        assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
      },
    });

    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);

    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    // push data, no links
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
          },
        },
      })
    );

    // push links, no data
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              links: {
                related: './user/1/pets',
              },
            },
          },
        },
      })
    );

    let Chris = run(() => store.peekRecord('user', '1'));
    run(() => get(Chris, 'pets'));
  });

  test('pushing has-many payloads with links (no data), then data (no links) works as expected', function (assert) {
    const User = Model.extend({
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
    });
    const Pet = Model.extend({
      owner: belongsTo('user', { async: false, inverse: 'pets' }),
    });
    const Adapter = JSONAPIAdapter.extend({
      findHasMany(_, __, link) {
        assert.strictEqual(link, './user/1/pets', 'We fetched via the correct link');
        return resolve({
          data: [
            {
              type: 'pet',
              id: '1',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
            {
              type: 'pet',
              id: '2',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
          ],
        });
      },
      findMany() {
        assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
      },
      findRecord() {
        assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
      },
    });

    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);

    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    // push links, no data
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              links: {
                related: './user/1/pets',
              },
            },
          },
        },
      })
    );

    // push data, no links
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
          },
        },
      })
    );

    let Chris = run(() => store.peekRecord('user', '1'));

    // we expect to still use the link info
    run(() => get(Chris, 'pets'));
  });

  test('pushing has-many payloads with links, then links again works as expected', function (assert) {
    const User = Model.extend({
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
    });
    const Pet = Model.extend({
      owner: belongsTo('user', { async: false, inverse: 'pets' }),
    });
    const Adapter = JSONAPIAdapter.extend({
      findHasMany(_, __, link) {
        assert.strictEqual(link, './user/1/pets', 'We fetched via the correct link');
        return resolve({
          data: [
            {
              type: 'pet',
              id: '1',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
            {
              type: 'pet',
              id: '2',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
          ],
        });
      },
      findMany() {
        assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
      },
      findRecord() {
        assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
      },
    });

    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);

    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    // push links, no data
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              links: {
                related: './user/1/not-pets',
              },
            },
          },
        },
      })
    );

    // push data, no links
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              links: {
                related: './user/1/pets',
              },
            },
          },
        },
      })
    );

    let Chris = run(() => store.peekRecord('user', '1'));

    // we expect to use the link info from the second push
    run(() => get(Chris, 'pets'));
  });

  test('pushing has-many payloads with links and data works as expected', function (assert) {
    const User = Model.extend({
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
    });
    const Pet = Model.extend({
      owner: belongsTo('user', { async: false, inverse: 'pets' }),
    });
    const Adapter = JSONAPIAdapter.extend({
      findHasMany(_, __, link) {
        assert.strictEqual(link, './user/1/pets', 'We fetched via the correct link');
        return resolve({
          data: [
            {
              type: 'pet',
              id: '1',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
            {
              type: 'pet',
              id: '2',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
          ],
        });
      },
      findMany() {
        assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
      },
      findRecord() {
        assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
      },
    });

    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);

    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    // push data and links
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
              links: {
                related: './user/1/pets',
              },
            },
          },
        },
      })
    );

    let Chris = run(() => store.peekRecord('user', '1'));
    run(() => get(Chris, 'pets'));
  });

  test('pushing has-many payloads with links, then one with links and data works as expected', function (assert) {
    const User = Model.extend({
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
    });
    const Pet = Model.extend({
      owner: belongsTo('user', { async: false, inverse: 'pets' }),
    });
    const Adapter = JSONAPIAdapter.extend({
      findHasMany(_, __, link) {
        assert.strictEqual(link, './user/1/pets', 'We fetched via the correct link');
        return resolve({
          data: [
            {
              type: 'pet',
              id: '1',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
            {
              type: 'pet',
              id: '2',
              relationships: {
                owner: {
                  data: { type: 'user', id: '1' },
                },
              },
            },
          ],
        });
      },
      findMany() {
        assert.ok(false, 'adapter findMany called instead of using findHasMany with a link');
      },
      findRecord() {
        assert.ok(false, 'adapter findRecord called instead of using findHasMany with a link');
      },
    });

    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);

    this.owner.register('adapter:application', Adapter);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    // push data, no links
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
          },
        },
      })
    );

    // push links and data
    run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            pets: {
              data: [
                { type: 'pet', id: '1' },
                { type: 'pet', id: '2' },
                { type: 'pet', id: '3' },
              ],
              links: {
                related: './user/1/pets',
              },
            },
          },
        },
      })
    );

    let Chris = run(() => store.peekRecord('user', '1'));
    run(() => get(Chris, 'pets'));
  });
});

module('integration/relationship/json-api-links | Relationship fetching', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const User = Model.extend({
      name: attr(),
      pets: hasMany('pet', { async: true, inverse: 'owner' }),
      home: belongsTo('home', { async: true, inverse: 'owner' }),
    });
    const Home = Model.extend({
      address: attr(),
      owner: belongsTo('user', { async: false, inverse: 'home' }),
    });
    const Pet = Model.extend({
      name: attr(),
      owner: belongsTo('user', { async: false, inverse: 'pets' }),
      friends: hasMany('pet', { async: false, inverse: 'friends' }),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);
    this.owner.register('model:home', Home);

    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
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
    test(`get+reload hasMany with ${description}`, function (assert) {
      assert.expect(3);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;
      adapter.findRecord = () => {
        assert.ok(false, 'We should not call findRecord');
      };
      adapter.findMany = () => {
        assert.ok(false, 'We should not call findMany');
      };
      adapter.findHasMany = (_, __, link) => {
        assert.strictEqual(
          link,
          payloads.user.data.relationships.pets.links.related,
          'We fetched the appropriate link'
        );
        return resolve(deepCopy(payloads.pets));
      };

      // setup user
      let user = run(() => store.push(deepCopy(payloads.user)));
      let pets = run(() => user.pets);

      assert.ok(!!pets, 'We found our pets');

      run(() => pets.reload());
    });

    test(`get+unload+get hasMany with ${description}`, async function (assert) {
      assert.expect(5);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

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
          assert.strictEqual(
            link,
            payloads.user.data.relationships.pets.links.related,
            'We fetched this link even though we really should not have'
          );
        } else {
          assert.strictEqual(
            link,
            payloads.user.data.relationships.pets.links.related,
            'We fetched the appropriate link'
          );
        }
        return resolve(deepCopy(payloads.pets));
      };

      // setup user
      let user = store.push(deepCopy(payloads.user));
      let pets = await user.pets;

      assert.ok(!!pets, 'We found our pets');

      if (!petRelDataWasEmpty) {
        pets.at(0).unloadRecord();
        assert.strictEqual(pets.length, 0, 'we unloaded');
        await user.pets;
        assert.strictEqual(pets.length, 1, 'we reloaded');
      } else {
        assert.ok(true, `We cant dirty a relationship we have no knowledge of`);
      }
    });

    test(`get+reload belongsTo with ${description}`, function (assert) {
      assert.expect(3);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

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
          assert.strictEqual(
            link,
            payloads.user.data.relationships.home.links.related,
            'We fetched the appropriate link'
          );
        }
        return resolve(deepCopy(payloads.home));
      };

      // setup user
      let user = run(() => store.push(deepCopy(payloads.user)));
      let home = run(() => user.home);

      if (homeRelWasEmpty) {
        assert.notOk(didFetchInitially, 'We did not fetch');
      }

      assert.ok(!!home, 'We found our home');
      isInitialFetch = false;

      run(() => home.reload());
    });

    test(`get+unload+get belongsTo with ${description}`, function (assert) {
      assert.expect(3);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

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
          !homeRelWasEmpty && link === payloads.user.data.relationships.home.links.related,
          'We fetched the appropriate link'
        );
        return resolve(deepCopy(payloads.home));
      };

      // setup user
      let user = run(() => store.push(deepCopy(payloads.user)));
      let home = run(() => user.home);

      assert.ok(!!home, 'We found our home');

      if (!homeRelWasEmpty) {
        run(() => home.then((h) => h.unloadRecord()));
        run(() => user.home);
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
          name: '@runspired',
        },
        relationships: {
          pets: {
            links: {
              related: './runspired/pets',
            },
          },
          home: {
            links: {
              related: './runspired/address',
            },
          },
        },
      },
    },
    pets: {
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      ],
    },
    home: {
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, Ca',
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1',
            },
          },
        },
      },
    },
  });

  shouldFetchLinkTests('a link and data (not available in the store)', {
    user: {
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          pets: {
            links: {
              related: './runspired/pets',
            },
            data: [{ type: 'pet', id: '1' }],
          },
          home: {
            links: {
              related: './runspired/address',
            },
            data: { type: 'home', id: '1' },
          },
        },
      },
    },
    pets: {
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
              links: {
                related: './user/1',
              },
            },
          },
        },
      ],
    },
    home: {
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, Ca',
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1',
            },
            links: {
              related: './user/1',
            },
          },
        },
      },
    },
  });

  /*
    Used for situations when initially we have data, but reload/missing data
    situations should be done via link
   */
  function shouldReloadWithLinkTests(description, payloads) {
    test(`get+reload hasMany with ${description}`, function (assert) {
      assert.expect(2);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;
      adapter.findRecord = () => {
        assert.ok(false, 'We should not call findRecord');
      };
      adapter.findMany = () => {
        assert.ok(false, 'We should not call findMany');
      };
      adapter.findHasMany = (_, __, link) => {
        assert.strictEqual(
          link,
          payloads.user.data.relationships.pets.links.related,
          'We fetched the appropriate link'
        );
        return resolve(deepCopy(payloads.pets));
      };

      // setup user and pets
      let user = run(() => store.push(deepCopy(payloads.user)));
      run(() => store.push(deepCopy(payloads.pets)));
      let pets = run(() => user.pets);

      assert.ok(!!pets, 'We found our pets');

      run(() => pets.reload());
    });

    test(`get+unload+get hasMany with ${description}`, async function (assert) {
      assert.expect(4);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;
      adapter.findRecord = () => {
        assert.ok(false, 'We should not call findRecord');
      };
      adapter.findMany = () => {
        assert.ok(false, 'We should not call findMany');
      };
      adapter.findHasMany = (_, __, link) => {
        assert.strictEqual(
          link,
          payloads.user.data.relationships.pets.links.related,
          'We fetched the appropriate link'
        );
        return resolve(deepCopy(payloads.pets));
      };

      // setup user and pets
      let user = store.push(deepCopy(payloads.user));
      store.push(deepCopy(payloads.pets));
      let pets = await user.pets;

      assert.ok(!!pets, 'We found our pets');

      pets.at(0).unloadRecord();
      assert.strictEqual(pets.length, 0, 'we unloaded our pet');
      await user.pets;
      assert.strictEqual(pets.length, 1, 'we have our pet again');
    });

    test(`get+reload belongsTo with ${description}`, function (assert) {
      assert.expect(2);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;
      adapter.findRecord = () => {
        assert.ok(false, 'We should not call findRecord');
      };
      adapter.findMany = () => {
        assert.ok(false, 'We should not call findMany');
      };
      adapter.findBelongsTo = (_, __, link) => {
        assert.strictEqual(
          link,
          payloads.user.data.relationships.home.links.related,
          'We fetched the appropriate link'
        );
        return resolve(deepCopy(payloads.home));
      };

      // setup user and home
      let user = run(() => store.push(deepCopy(payloads.user)));
      run(() => store.push(deepCopy(payloads.home)));
      let home = run(() => user.home);

      assert.ok(!!home, 'We found our home');

      run(() => home.reload());
    });

    test(`get+unload+get belongsTo with ${description}`, function (assert) {
      assert.expect(2);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;
      adapter.findRecord = () => {
        assert.ok(false, 'We should not call findRecord');
      };
      adapter.findMany = () => {
        assert.ok(false, 'We should not call findMany');
      };
      adapter.findBelongsTo = (_, __, link) => {
        assert.strictEqual(
          link,
          payloads.user.data.relationships.home.links.related,
          'We fetched the appropriate link'
        );
        return resolve(deepCopy(payloads.home));
      };

      // setup user
      let user = run(() => store.push(deepCopy(payloads.user)));
      run(() => store.push(deepCopy(payloads.home)));
      let home;
      run(() => user.home.then((h) => (home = h)));

      assert.ok(!!home, 'We found our home');

      run(() => home.unloadRecord());
      run(() => user.home);
    });
  }

  shouldReloadWithLinkTests('a link and data (available in the store)', {
    user: {
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          pets: {
            links: {
              related: './runspired/pets',
            },
            data: [{ type: 'pet', id: '1' }],
          },
          home: {
            links: {
              related: './runspired/address',
            },
            data: { type: 'home', id: '1' },
          },
        },
      },
    },
    pets: {
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      ],
    },
    home: {
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, Ca',
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1',
            },
          },
        },
      },
    },
  });

  shouldReloadWithLinkTests('a link and empty data (`data: []` or `data: null`), true inverse loaded', {
    user: {
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          pets: {
            links: {
              related: './runspired/pets',
            },
            data: [],
          },
          home: {
            links: {
              related: './runspired/address',
            },
            data: null,
          },
        },
      },
    },
    pets: {
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
              links: {
                related: './user/1',
              },
            },
          },
        },
      ],
    },
    home: {
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, Ca',
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1',
            },
            links: {
              related: './user/1',
            },
          },
        },
      },
    },
  });

  shouldReloadWithLinkTests('a link and empty data (`data: []` or `data: null`), true inverse unloaded', {
    user: {
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          pets: {
            links: {
              related: './runspired/pets',
            },
            data: [],
          },
          home: {
            links: {
              related: './runspired/address',
            },
            data: null,
          },
        },
      },
    },
    pets: {
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      ],
    },
    home: {
      data: {
        type: 'home',
        id: '1',
        attributes: {
          address: 'Oakland, Ca',
        },
        relationships: {
          owner: {
            data: {
              type: 'user',
              id: '1',
            },
          },
        },
      },
    },
  });

  /*
    Ad Hoc Situations when we don't have a link
   */

  // data, no links
  test(`get+reload hasMany with data, no links`, function (assert) {
    assert.expect(3);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    // setup user
    let user = run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: '@runspired',
          },
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
            home: {
              data: { type: 'home', id: '1' },
            },
          },
        },
      })
    );
    let pets = run(() => user.pets);

    assert.ok(!!pets, 'We found our pets');

    run(() => pets.reload());
  });

  test(`get+unload+get hasMany with data, no links`, async function (assert) {
    assert.expect(5);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    let user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          pets: {
            data: [{ type: 'pet', id: '1' }],
          },
          home: {
            data: { type: 'home', id: '1' },
          },
        },
      },
    });
    let pets = await user.pets;

    assert.ok(!!pets, 'We found our pets');
    pets.at(0).unloadRecord();
    assert.strictEqual(pets.length, 0, 'we unloaded our pet');
    await user.pets;
    assert.strictEqual(pets.length, 1, 'we reloaded our pet');
  });

  test(`get+reload belongsTo with data, no links`, function (assert) {
    assert.expect(3);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'home',
          id: '1',
          attributes: {
            address: 'Oakland, CA',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    // setup user
    let user = run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: '@runspired',
          },
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
            home: {
              data: { type: 'home', id: '1' },
            },
          },
        },
      })
    );
    let home = run(() => user.home);

    assert.ok(!!home, 'We found our home');

    run(() => home.reload());
  });

  test(`get+unload+get belongsTo with data, no links`, function (assert) {
    assert.expect(3);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'home',
          id: '1',
          attributes: {
            address: 'Oakland, Ca',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    // setup user
    let user = run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: '@runspired',
          },
          relationships: {
            pets: {
              data: [{ type: 'pet', id: '1' }],
            },
            home: {
              data: { type: 'home', id: '1' },
            },
          },
        },
      })
    );
    let home = run(() => user.home);

    assert.ok(!!home, 'We found our home');

    run(() => home.then((h) => h.unloadRecord()));
    run(() => user.home);
  });

  // missing data setup from the other side, no links
  test(`get+reload hasMany with missing data setup from the other side, no links`, async function (assert) {
    assert.expect(4);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    // setup user and pet
    let user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {},
      },
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      ],
    });
    let pets = await user.pets;
    assert.strictEqual(pets.length, 1, 'we setup the pets');

    assert.ok(!!pets, 'We found our pets');

    await pets.reload();
    assert.strictEqual(pets.length, 1, 'still only the one');
  });
  test(`get+unload+get hasMany with missing data setup from the other side, no links`, async function (assert) {
    assert.expect(5);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    // setup user and pet
    let user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {},
      },
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shen',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      ],
    });

    // should not trigger a fetch bc even though we don't consider `pets` to have complete knowledge
    // we have no knowledge with which to initate a request.
    let pets = await user.pets;

    assert.ok(!!pets, 'We found our pets');
    assert.strictEqual(pets.length, 1, 'we loaded our pets');
    pets.at(0).unloadRecord();
    assert.strictEqual(pets.length, 0, 'we unloaded our pets');

    // should trigger a findRecord for the unloaded pet
    await user.pets;
    assert.strictEqual(pets.length, 1, 'we reloaded our pets');
  });

  test(`get+reload belongsTo with missing data setup from the other side, no links`, function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'home',
          id: '1',
          attributes: {
            address: 'Oakland, CA',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    // setup user and home
    let user = run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: '@runspired',
          },
          relationships: {},
        },
        included: [
          {
            type: 'home',
            id: '1',
            attributes: {
              address: 'Oakland, CA',
            },
            relationships: {
              owner: {
                data: {
                  type: 'user',
                  id: '1',
                },
              },
            },
          },
        ],
      })
    );
    let home = run(() => user.home);

    assert.ok(!!home, 'We found our home');

    run(() => home.reload());
  });
  test(`get+unload+get belongsTo with missing data setup from the other side, no links`, function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = () => {
      assert.ok(true, 'We should call findRecord');
      return resolve({
        data: {
          type: 'home',
          id: '1',
          attributes: {
            address: 'Oakland, CA',
          },
          relationships: {
            owner: {
              data: {
                type: 'user',
                id: '1',
              },
            },
          },
        },
      });
    };
    adapter.findMany = () => {
      assert.ok(false, 'We should not call findMany');
    };
    adapter.findHasMany = () => {
      assert.ok(false, 'We should not call findHasMany');
    };

    // setup user and home
    let user = run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: '@runspired',
          },
          relationships: {},
        },
        included: [
          {
            type: 'home',
            id: '1',
            attributes: {
              address: 'Oakland, CA',
            },
            relationships: {
              owner: {
                data: {
                  type: 'user',
                  id: '1',
                },
              },
            },
          },
        ],
      })
    );
    let home = run(() => user.home);

    assert.ok(!!home, 'We found our home');

    run(() => home.then((h) => h.unloadRecord()));
    run(() => user.home);
  });

  // empty data, no links
  test(`get+reload hasMany with empty data, no links`, function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

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
    let user = run(() =>
      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: '@runspired',
          },
          relationships: {
            pets: {
              data: [],
            },
            home: {
              data: null,
            },
          },
        },
      })
    );
    let pets = run(() => user.pets);

    assert.ok(!!pets, 'We found our pets');

    run(() => pets.reload());
  });

  /*
    Ad hoc situations where we do have a link
   */
  test('We should not fetch a hasMany relationship with links that we know is empty', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let user1Payload = {
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: '@runspired',
        },
        relationships: {
          pets: {
            links: {
              related: './runspired/pets',
            },
            data: [], // we are explicitly told this is empty
          },
        },
      },
    };
    let user2Payload = {
      data: {
        type: 'user',
        id: '2',
        attributes: {
          name: '@hjdivad',
        },
        relationships: {
          pets: {
            links: {
              related: './hjdivad/pets',
            },
            // we have no data, so we do not know that this is empty
          },
        },
      },
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
        assert.strictEqual(
          link,
          requestedUser.data.relationships.pets.links.related,
          'We fetched the appropriate link'
        );
      }

      return resolve({
        data: [],
      });
    };

    // setup users
    let user1 = run(() => store.push(deepCopy(user1Payload)));
    let user2 = run(() => store.push(deepCopy(user2Payload)));

    // should not fire a request
    requestedUser = null;
    failureDescription = 'We improperly fetched the link for a known empty relationship';
    run(() => user1.pets);

    // still should not fire a request
    requestedUser = null;
    failureDescription = 'We improperly fetched the link (again) for a known empty relationship';
    run(() => user1.pets);

    // should fire a request
    requestedUser = user2Payload;
    run(() => user2.pets);

    // should not fire a request
    requestedUser = null;
    failureDescription = 'We improperly fetched the link for a previously fetched and found to be empty relationship';
    run(() => user2.pets);
  });

  test('We should not fetch a sync hasMany relationship with a link that is missing the data member', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let petPayload = {
      data: {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen',
        },
        relationships: {
          friends: {
            links: {
              related: './shen/friends',
            },
          },
        },
      },
    };

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
    adapter.findBelongsTo = () => {
      assert.ok(false, 'We should not call findBelongsTo');
    };

    // setup users
    let shen = run(() => store.push(petPayload));

    // should not fire a request
    run(() => shen.pets);

    assert.ok(true, 'We reached the end of the test');
  });

  test('We should not fetch a sync belongsTo relationship with a link that is missing the data member', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let petPayload = {
      data: {
        type: 'pet',
        id: '1',
        attributes: {
          name: 'Shen',
        },
        relationships: {
          owner: {
            links: {
              related: './shen/owner',
              self: './owner/a',
            },
          },
        },
      },
    };

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
    adapter.findBelongsTo = () => {
      assert.ok(false, 'We should not call findBelongsTo');
    };

    // setup users
    let shen = run(() => store.push(petPayload));

    // should not fire a request
    run(() => shen.owner);

    assert.ok(true, 'We reached the end of the test');
  });
});
