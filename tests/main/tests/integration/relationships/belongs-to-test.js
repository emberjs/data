import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { hash, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

import { getRelationshipStateForRecord, hasRelationshipForRecord } from '../../helpers/accessors';

module('integration/relationship/belongs-to BelongsTo Relationships (new-style)', function (hooks) {
  let store;
  setupTest(hooks);

  class Person extends Model {
    @belongsTo('pet', { inverse: 'bestHuman', async: true })
    bestDog;
    @attr()
    name;
  }

  class Pet extends Model {
    @belongsTo('person', { inverse: 'bestDog', async: false })
    bestHuman;
    @attr()
    name;
  }

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, payload) {
          return payload;
        },
      })
    );
    store = owner.lookup('service:store');
  });

  testInDebug(
    'belongsTo relationships fetched by link should error if no data member is present in the returned payload',
    async function (assert) {
      class Company extends Model {
        @belongsTo('company', { inverse: null, async: true })
        parentCompany;
        @attr()
        name;
      }
      this.owner.register('model:company', Company);
      this.owner.register(
        'adapter:company',
        JSONAPIAdapter.extend({
          findBelongsTo(store, type, snapshot) {
            return resolve({
              links: {
                related: 'company/1/parent-company',
              },
              meta: {},
            });
          },
        })
      );

      const company = store.push({
        data: {
          type: 'company',
          id: '1',
          attributes: {
            name: 'Github',
          },
          relationships: {
            parentCompany: {
              links: {
                related: 'company/1/parent-company',
              },
            },
          },
        },
      });

      try {
        await company.parentCompany;
        assert.ok(false, 'We should have thrown an error');
      } catch (e) {
        assert.strictEqual(
          e.message,
          `Assertion Failed: fetched the belongsTo relationship 'parentCompany' for company:1 with link 'company/1/parent-company', but no data member is present in the response. If no data exists, the response should set { data: null }`,
          'We error appropriately'
        );
      }
    }
  );

  test("belongsTo saving with relationship that references yourself doesn't blow up", async function (assert) {
    class Company extends Model {
      @belongsTo('company', { inverse: null, async: true })
      parentCompany;
      @attr()
      name;
    }

    this.owner.register('model:company', Company);
    this.owner.register(
      'adapter:company',
      JSONAPIAdapter.extend({
        createRecord(store, type, snapshot) {
          return resolve({
            data: {
              type: 'company',
              id: '123',
              attributes: { name: 'Acme Corporation' },
              relationships: {
                parentCompany: {
                  data: { type: 'company', id: '123' },
                },
              },
            },
          });
        },
      })
    );

    let company = store.createRecord('company', { name: 'Acme Corporation' });
    await company.save();
    assert.strictEqual(company.id, '123', 'We updated to the correct id');
    assert.strictEqual(company.belongsTo('parentCompany').id(), company.id, 'We are able to reference ourselves');
  });

  test("async belongsTo chains the related record's loading promise when present", async function (assert) {
    let petFindRecordCalls = 0;
    this.owner.register(
      'adapter:pet',
      JSONAPIAdapter.extend({
        findRecord() {
          assert.strictEqual(++petFindRecordCalls, 1, 'We call findRecord only once for our pet');
          return resolve({
            data: {
              type: 'pet',
              id: '1',
              attributes: { name: 'Shen' },
              relationships: {
                bestHuman: {
                  data: { type: 'person', id: '1' },
                },
              },
            },
          });
        },
        findBelongsTo() {
          return this.store.adapterFor('person').findRecord();
        },
      })
    );
    let personFindRecordCalls = 0;
    this.owner.register(
      'adapter:person',
      JSONAPIAdapter.extend({
        findRecord() {
          assert.strictEqual(++personFindRecordCalls, 1, 'We call findRecord only once for our person');
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: { name: 'Chris' },
              relationships: {
                bestDog: {
                  data: { type: 'pet', id: '1' },
                  links: {
                    related: './pet/1',
                  },
                },
              },
            },
          });
        },
        findBelongsTo() {
          return this.store.adapterFor('pet').findRecord();
        },
      })
    );

    let person = await store.findRecord('person', '1');
    let petRequest = store.findRecord('pet', '1');
    let personPetRequest = person.bestDog;
    let personPet = await personPetRequest;
    let pet = await petRequest;

    assert.strictEqual(personPet, pet, 'We ended up in the same state');
  });

  test('async belongsTo returns correct new value after a local change', async function (assert) {
    let chris = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          bestDog: {
            data: null,
          },
        },
      },
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            bestHuman: {
              data: null,
            },
          },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Pirate' },
          relationships: {
            bestHuman: {
              data: null,
            },
          },
        },
      ],
    });

    let shen = store.peekRecord('pet', '1');
    let pirate = store.peekRecord('pet', '2');
    let bestDog = await chris.bestDog;

    assert.strictEqual(shen.bestHuman, null, 'precond - Shen has no best human');
    assert.strictEqual(pirate.bestHuman, null, 'precond - pirate has no best human');
    assert.strictEqual(bestDog, null, 'precond - Chris has no best dog');

    chris.set('bestDog', shen);
    bestDog = await chris.bestDog;

    assert.strictEqual(shen.bestHuman, chris, "scene 1 - Chris is Shen's best human");
    assert.strictEqual(pirate.bestHuman, null, 'scene 1 - pirate has no best human');
    assert.strictEqual(bestDog, shen, "scene 1 - Shen is Chris's best dog");

    chris.set('bestDog', pirate);
    bestDog = await chris.bestDog;

    assert.strictEqual(shen.bestHuman, null, "scene 2 - Chris is no longer Shen's best human");
    assert.strictEqual(pirate.bestHuman, chris, 'scene 2 - pirate now has Chris as best human');
    assert.strictEqual(bestDog, pirate, "scene 2 - Pirate is now Chris's best dog");

    chris.set('bestDog', null);
    bestDog = await chris.bestDog;

    assert.strictEqual(shen.bestHuman, null, "scene 3 - Chris remains no longer Shen's best human");
    assert.strictEqual(pirate.bestHuman, null, 'scene 3 - pirate no longer has Chris as best human');
    assert.strictEqual(bestDog, null, 'scene 3 - Chris has no best dog');
  });

  test('async belongsTo id is accessible during load', async function (assert) {
    this.owner.register(
      'adapter:application',
      class extends JSONAPIAdapter {
        findRecord() {
          return new Promise((resolve) => setTimeout(resolve, 1)).then(() => {
            return {
              data: {
                type: 'pet',
                id: '2',
                attributes: { name: 'Shen' },
                relationships: {
                  bestHuman: {
                    data: { type: 'person', id: '1' },
                  },
                },
              },
            };
          });
        }
      }
    );

    const person = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: { name: 'Chris' },
        relationships: {
          bestDog: { data: { type: 'pet', id: '2' } },
        },
      },
    });

    const req = person.bestDog;
    assert.strictEqual(req.get('id'), '2', 'the id is present on the proxy');
    const dog = await req;

    assert.strictEqual(dog.id, '2', 'We loaded');
    assert.strictEqual(dog.name, 'Shen', 'We loaded');
  });
});

module('integration/relationship/belongs_to Belongs-To Relationships', function (hooks) {
  setupTest(hooks);
  class User extends Model {
    @attr('string') name;
    @hasMany('message', { polymorphic: true, async: false, inverse: 'user' }) messages;
    @belongsTo('message', { polymorphic: true, inverse: null, async: false }) favouriteMessage;
  }

  class Message extends Model {
    @belongsTo('user', { inverse: 'messages', async: false, as: 'message' }) user;
    @attr('date') created_at;
  }

  class Comment extends Model {
    @attr('string') body;
    @attr('date') created_at;
    @belongsTo('user', { inverse: 'messages', async: false, as: 'message' }) user;
    @belongsTo('message', { polymorphic: true, async: false, inverse: null }) message;
  }
  class Post extends Model {
    @attr('string') title;
    @attr('date') created_at;
    @belongsTo('user', { inverse: 'messages', async: false, as: 'message' }) user;
    @hasMany('comment', { async: false, inverse: null }) comments;
  }

  class Book extends Model {
    @attr name;
    @belongsTo('author', { async: false, inverse: 'books' }) author;
    @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
  }

  class Book1 extends Model {
    @attr name;
  }

  class Chapter extends Model {
    @attr title;
    @belongsTo('book', { async: false, inverse: 'chapters' }) book;
  }

  class Author extends Model {
    @attr name;
    @hasMany('book', { async: false, inverse: 'author' }) books;
  }

  class Section extends Model {
    @attr name;
  }

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:message', Message);
    this.owner.register('model:book', Book);
    this.owner.register('model:book1', Book1);
    this.owner.register('model:chapter', Chapter);
    this.owner.register('model:author', Author);
    this.owner.register('model:section', Section);

    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    this.owner.register(
      'serializer:user',
      JSONAPISerializer.extend({
        attrs: {
          favouriteMessage: { embedded: 'always' },
        },
      })
    );
  });

  test('returning a null relationship from payload sets the relationship to null on both sides', async function (assert) {
    this.owner.register(
      'model:app',
      Model.extend({
        name: attr('string'),
        team: belongsTo('team', { async: true, inverse: 'apps' }),
      })
    );
    this.owner.register(
      'model:team',
      Model.extend({
        apps: hasMany('app', { async: true, inverse: 'team' }),
      })
    );

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.push({
      data: {
        id: '1',
        type: 'app',
        relationships: {
          team: {
            data: {
              id: '1',
              type: 'team',
            },
          },
        },
      },
      included: [
        {
          id: '1',
          type: 'team',
          relationships: {
            apps: {
              data: [
                {
                  id: '1',
                  type: 'app',
                },
              ],
            },
          },
        },
      ],
    });

    const app = store.peekRecord('app', '1');
    const team = store.peekRecord('team', '1');
    let appTeam = await app.team;
    assert.strictEqual(appTeam.id, team.id, 'sets team correctly on app');
    const apps = await team.apps;
    assert.deepEqual(
      apps.slice().map((r) => r.id),
      ['1'],
      'sets apps correctly on team'
    );

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = (store, type, snapshot) => {
      return resolve({
        data: {
          id: '1',
          type: 'app',
          attributes: {
            name: 'Hello',
          },
          relationships: {
            team: {
              data: null,
            },
          },
        },
      });
    };

    app.set('name', 'Hello');
    await app.save();
    appTeam = await app.team;
    assert.strictEqual(appTeam?.id, undefined, 'team removed from app relationship');
    assert.deepEqual(
      apps.slice().map((r) => r.id),
      [],
      'app removed from team apps relationship'
    );
  });

  test('The store can materialize a non loaded monomorphic belongsTo association', function (assert) {
    assert.expect(1);

    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { async: false, inverse: null }) comments;
      @belongsTo('user', { async: true, inverse: 'messages', as: 'message' }) user;
    }
    this.owner.register('model:post', Post);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(true, "The adapter's find method should be called");
      return resolve({
        data: {
          id,
          type: snapshot.modelName,
        },
      });
    };

    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            user: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
    });

    return run(() => {
      return store.findRecord('post', 1).then((post) => {
        post.user;
      });
    });
  });

  testInDebug('Invalid belongsTo relationship identifiers throw errors for null id', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    // test null id
    assert.expectAssertion(() => {
      run(() => {
        let post = store.push({
          data: {
            id: '1',
            type: 'post',
            relationships: {
              user: {
                data: {
                  id: null,
                  type: 'user',
                },
              },
            },
          },
        });
        post.user;
      });
    }, /Assertion Failed: Encountered a relationship identifier without an id for the belongsTo relationship 'user' on <post:1>, expected an identifier but found/);
  });

  testInDebug('Invalid belongsTo relationship identifiers throw errors for null type', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    // test missing type
    assert.expectAssertion(() => {
      run(() => {
        let post = store.push({
          data: {
            id: '2',
            type: 'post',
            relationships: {
              user: {
                data: {
                  id: '1',
                  type: null,
                },
              },
            },
          },
        });
        post.user;
      });
    }, /Assertion Failed: Encountered a relationship identifier without a type for the belongsTo relationship 'user' on <post:2>, expected an identifier with type 'user' but found/);
  });

  testInDebug(
    'Only a record of the same modelClass can be used with a monomorphic belongsTo relationship',
    async function (assert) {
      assert.expect(1);
      let store = this.owner.lookup('service:store');

      const post = store.push({
        data: {
          id: '1',
          type: 'post',
        },
      });
      const comment = store.push({
        data: {
          id: '2',
          type: 'comment',
        },
      });

      assert.expectAssertion(() => {
        post.user = comment;
      }, /The '<message>.user' relationship expects only 'user' records since it is not polymorphic. Received a Record of type 'comment'/);
    }
  );

  test('The store can load a polymorphic belongsTo association', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'post',
        },
      });

      store.push({
        data: {
          id: '2',
          type: 'comment',
          relationships: {
            message: {
              data: {
                id: '1',
                type: 'post',
              },
            },
          },
        },
      });
    });

    return run(() => {
      return hash({
        message: store.findRecord('post', 1),
        comment: store.findRecord('comment', 2),
      }).then((records) => {
        assert.strictEqual(records.comment.message, records.message);
      });
    });
  });

  test('The store can serialize a polymorphic belongsTo association', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let serializerInstance = store.serializerFor('comment');

    serializerInstance.serializePolymorphicType = function (record, json, relationship) {
      assert.ok(true, "The serializer's serializePolymorphicType method should be called");
      json['message_type'] = 'post';
    };

    return run(() => {
      store.push({
        data: {
          id: '1',
          type: 'post',
        },
      });

      store.push({
        data: {
          id: '2',
          type: 'comment',
          relationships: {
            message: {
              data: {
                id: '1',
                type: 'post',
              },
            },
          },
        },
      });

      return store.findRecord('comment', 2).then((comment) => {
        let serialized = comment.serialize({ includeId: true });
        assert.strictEqual(serialized.data.relationships.message.data.id, '1');
        assert.strictEqual(serialized.data.relationships.message.data.type, 'posts');
      });
    });
  });

  test('A serializer can materialize a belongsTo as a link that gets sent back to findBelongsTo', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let Group = Model.extend({
      people: hasMany('person', { async: false, inverse: 'group' }),
    });

    let Person = Model.extend({
      group: belongsTo('group', { async: true, inverse: 'people' }),
    });

    this.owner.register('model:group', Group);
    this.owner.register('model:person', Person);

    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            group: {
              links: {
                related: '/people/1/group',
              },
            },
          },
        },
      });
    });

    adapter.findRecord = function (store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.findBelongsTo = function (store, snapshot, link, relationship) {
      assert.strictEqual(relationship.type, 'group');
      assert.strictEqual(relationship.key, 'group');
      assert.strictEqual(link, '/people/1/group');

      return resolve({
        data: {
          id: '1',
          type: 'group',
          relationships: {
            people: {
              data: [{ id: '1', type: 'person' }],
            },
          },
        },
      });
    };

    return run(() => {
      return store
        .findRecord('person', 1)
        .then((person) => {
          return person.group;
        })
        .then((group) => {
          assert.ok(group instanceof Group, 'A group object is loaded');
          assert.strictEqual(group.id, '1', 'It is the group we are expecting');
        });
    });
  });

  test('A record with an async belongsTo relationship always returns a promise for that relationship', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let Seat = Model.extend({
      person: belongsTo('person', { async: false, inverse: 'seat' }),
    });

    let Person = Model.extend({
      seat: belongsTo('seat', { async: true, inverse: 'person' }),
    });

    this.owner.register('model:seat', Seat);
    this.owner.register('model:person', Person);

    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            seat: {
              links: {
                related: '/people/1/seat',
              },
            },
          },
        },
      });
    });

    adapter.findRecord = function (store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.findBelongsTo = function (store, snapshot, link, relationship) {
      return resolve({ data: { id: '1', type: 'seat' } });
    };

    return run(() => {
      return store.findRecord('person', 1).then((person) => {
        return person.seat.then((seat) => {
          // this assertion fails too
          // ok(seat.person === person, 'parent relationship should be populated');
          seat.set('person', person);
          assert.ok(person.seat.then, 'seat should be a PromiseObject');
        });
      });
    });
  });

  test('A record with an async belongsTo relationship returning null should resolve null', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let Group = Model.extend({
      people: hasMany('person', { async: false, inverse: 'group' }),
    });

    let Person = Model.extend({
      group: belongsTo('group', { async: true, inverse: 'people' }),
    });

    this.owner.register('model:group', Group);
    this.owner.register('model:person', Person);

    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            group: {
              links: {
                related: '/people/1/group',
              },
            },
          },
        },
      });
    });

    adapter.findRecord = function (store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.findBelongsTo = function (store, snapshot, link, relationship) {
      return resolve({ data: null });
    };

    return store
      .findRecord('person', '1')
      .then((person) => {
        return person.group;
      })
      .then((group) => {
        assert.strictEqual(group, null, 'group should be null');
      });
  });

  deprecatedTest(
    'A record can be created with a resolved belongsTo promise',
    { id: 'ember-data:deprecate-promise-proxies', until: '5.0' },
    async function (assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;

      let Group = Model.extend({
        people: hasMany('person', { async: false, inverse: 'group' }),
      });

      let Person = Model.extend({
        group: belongsTo('group', { async: true, inverse: 'people' }),
      });

      this.owner.register('model:group', Group);
      this.owner.register('model:person', Person);

      store.push({
        data: {
          id: '1',
          type: 'group',
        },
      });
      const originalOwner = store.push({
        data: {
          id: '1',
          type: 'person',
          group: { data: { type: 'group', id: '1' } },
        },
      });

      let groupPromise = originalOwner.group;
      const group = await groupPromise;
      let person = store.createRecord('person', {
        group: groupPromise,
      });
      const personGroup = await person.group;
      assert.strictEqual(personGroup, group, 'the group matches');
    }
  );

  test('polymorphic belongsTo class-checks check the superclass', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    run(() => {
      let igor = store.createRecord('user', { name: 'Igor' });
      let post = store.createRecord('post', { title: "Igor's unimaginative blog post" });

      igor.set('favouriteMessage', post);

      assert.strictEqual(igor.favouriteMessage.title, "Igor's unimaginative blog post");
    });
  });

  test('relationship changes shouldn’t cause async fetches', function (assert) {
    assert.expect(2);

    /*  Scenario:
     *  ---------
     *
     *    post HM async comments
     *    comments bt sync post
     *
     *    scenario:
     *     - post hm C [1,2,3]
     *     - post has a partially realized comments array comment#1 has been realized
     *     - comment has not yet realized its post relationship
     *     - comment is destroyed
     */

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    class Message extends Model {
      @attr('date') created_at;
    }
    class Post extends Message {
      @attr('string') title;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }

    class Comment extends Message {
      @attr('string') body;
      @belongsTo('message', { polymorphic: true, async: false, inverse: null }) message;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:message', Message);
    this.owner.register('model:comment', Comment);

    let comment;
    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              data: [
                {
                  id: '1',
                  type: 'comment',
                },
                {
                  id: '2',
                  type: 'comment',
                },
                {
                  id: '3',
                  type: 'comment',
                },
              ],
            },
          },
        },
      });

      comment = store.push({
        data: {
          id: '1',
          type: 'comment',
          relationships: {
            post: {
              data: {
                id: '1',
                type: 'post',
              },
            },
          },
        },
      });
    });

    adapter.deleteRecord = function (store, type, snapshot) {
      assert.ok(snapshot.record instanceof type);
      assert.strictEqual(snapshot.id, '1', 'should first comment');
      return {
        data: {
          id: snapshot.record.id,
          type: 'comment',
        },
      };
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(false, 'should not need to findMay more comments, but attempted to anyways');
    };

    run(comment, 'destroyRecord');
  });

  test('Destroying a record with an unloaded aync belongsTo association does not fetch the record', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post;

    class Post extends Model {
      @attr('string') title;
      @belongsTo('user', { async: true, inverse: 'messages', as: 'message' }) user;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:message', Message);
    this.owner.register('model:comment', Comment);

    run(() => {
      post = store.push({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            user: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
    });

    adapter.findRecord = function (store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.deleteRecord = function (store, type, snapshot) {
      assert.ok(snapshot.record instanceof type);
      assert.strictEqual(snapshot.id, '1', 'should first post');
      return {
        data: {
          id: '1',
          type: 'post',
          attributes: {
            title: null,
            'created-at': null,
          },
          relationships: {
            user: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      };
    };

    run(post, 'destroyRecord');
  });

  testInDebug('A sync belongsTo errors out if the record is unloaded', function (assert) {
    let store = this.owner.lookup('service:store');

    let message;
    run(() => {
      message = store.push({
        data: {
          id: '1',
          type: 'message',
          relationships: {
            user: {
              data: {
                id: '2',
                type: 'user',
              },
            },
          },
        },
      });
    });

    assert.expectAssertion(() => {
      message.user;
    }, /You looked up the 'user' relationship on a 'message' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`belongsTo\(<type>, { async: true, inverse: <inverse> }\)`\)/);
  });

  test('Rollbacking attributes for a deleted record restores implicit relationship - async', function (assert) {
    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let book, author;
    run(() => {
      book = store.push({
        data: {
          id: '1',
          type: 'book',
          attributes: {
            name: "Stanley's Amazing Adventures",
          },
          relationships: {
            author: {
              data: {
                id: '2',
                type: 'author',
              },
            },
          },
        },
      });
      author = store.push({
        data: {
          id: '2',
          type: 'author',
          attributes: {
            name: 'Stanley',
          },
        },
      });
    });
    return run(() => {
      author.deleteRecord();
      author.rollbackAttributes();

      return book.author.then((fetchedAuthor) => {
        assert.strictEqual(fetchedAuthor, author, 'Book has an author after rollback attributes');
      });
    });
  });

  test('Rollbacking attributes for a deleted record restores implicit relationship - sync', function (assert) {
    let store = this.owner.lookup('service:store');
    let book, author;

    run(() => {
      book = store.push({
        data: {
          id: '1',
          type: 'book',
          attributes: {
            name: "Stanley's Amazing Adventures",
          },
          relationships: {
            author: {
              data: {
                id: '2',
                type: 'author',
              },
            },
          },
        },
      });

      author = store.push({
        data: {
          id: '2',
          type: 'author',
          attributes: {
            name: 'Stanley',
          },
        },
      });
    });

    run(() => {
      author.deleteRecord();
      author.rollbackAttributes();
    });

    assert.strictEqual(book.author, author, 'Book has an author after rollback attributes');
  });

  testInDebug('Passing a model as type to belongsTo should not work', function (assert) {
    assert.expect(2);

    assert.expectAssertion(() => {
      const User = Model.extend();

      Model.extend({
        user: belongsTo(User, { async: false, inverse: null }),
      });
    }, /The first argument to belongsTo must be a string/);
    assert.expectDeprecation({ id: 'ember-data:deprecate-non-strict-relationships' });
  });

  test('belongsTo hasAnyRelationshipData async loaded', function (assert) {
    assert.expect(1);
    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'The Greatest Book' },
          relationships: {
            author: { data: { id: '2', type: 'author' } },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then((book) => {
        let relationship = getRelationshipStateForRecord(book, 'author');
        assert.true(relationship.state.hasReceivedData, 'relationship has data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData sync loaded', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'The Greatest Book' },
          relationships: {
            author: { data: { id: '2', type: 'author' } },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then((book) => {
        let relationship = getRelationshipStateForRecord(book, 'author');
        assert.true(relationship.state.hasReceivedData, 'relationship has data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData async not loaded', function (assert) {
    assert.expect(1);
    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'The Greatest Book' },
          relationships: {
            author: { links: { related: 'author' } },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then((book) => {
        let relationship = getRelationshipStateForRecord(book, 'author');
        assert.false(relationship.state.hasReceivedData, 'relationship does not have data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData sync not loaded', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'The Greatest Book' },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then((book) => {
        let relationship = getRelationshipStateForRecord(book, 'author');
        assert.false(relationship.state.hasReceivedData, 'relationship does not have data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData NOT created', function (assert) {
    assert.expect(2);
    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);
    let store = this.owner.lookup('service:store');

    run(() => {
      let author = store.createRecord('author');
      let book = store.createRecord('book', { name: 'The Greatest Book' });
      let relationship = getRelationshipStateForRecord(book, 'author');

      assert.false(relationship.state.hasReceivedData, 'relationship does not have data');

      book = store.createRecord('book', {
        name: 'The Greatest Book',
        author,
      });

      relationship = getRelationshipStateForRecord(book, 'author');

      assert.true(relationship.state.hasReceivedData, 'relationship has data');
    });
  });

  test('belongsTo hasAnyRelationshipData sync created', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');

    run(() => {
      let author = store.createRecord('author');
      let book = store.createRecord('book', {
        name: 'The Greatest Book',
      });

      let relationship = getRelationshipStateForRecord(book, 'author');
      assert.false(relationship.state.hasReceivedData, 'relationship does not have data');

      book = store.createRecord('book', {
        name: 'The Greatest Book',
        author,
      });

      relationship = getRelationshipStateForRecord(book, 'author');
      assert.true(relationship.state.hasReceivedData, 'relationship has data');
    });
  });

  test("Model's belongsTo relationship should not be created during model creation", function (assert) {
    let store = this.owner.lookup('service:store');
    let user;

    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
        },
      });

      assert.notOk(
        hasRelationshipForRecord(user, 'favouriteMessage'),
        'Newly created record should not have relationships'
      );
    });
  });

  test("Model's belongsTo relationship should be created during model creation if relationship passed in constructor", function (assert) {
    let store = this.owner.lookup('service:store');
    let message = store.createRecord('message');
    let user = store.createRecord('user', {
      name: 'John Doe',
      favouriteMessage: message,
    });

    assert.ok(
      hasRelationshipForRecord(user, 'favouriteMessage'),
      'Newly created record with relationships in params passed in its constructor should have relationships'
    );
  });

  test("Model's belongsTo relationship should be created during 'set' method", function (assert) {
    let store = this.owner.lookup('service:store');
    let user, message;

    run(() => {
      message = store.createRecord('message');
      user = store.createRecord('user');
      user.set('favouriteMessage', message);
      assert.ok(
        hasRelationshipForRecord(user, 'favouriteMessage'),
        'Newly created record with relationships in params passed in its constructor should have relationships'
      );
    });
  });

  test("Model's belongsTo relationship should be created during 'get' method", function (assert) {
    let store = this.owner.lookup('service:store');
    let user;

    run(() => {
      user = store.createRecord('user');
      user.favouriteMessage;
      assert.ok(
        hasRelationshipForRecord(user, 'favouriteMessage'),
        'Newly created record with relationships in params passed in its constructor should have relationships'
      );
    });
  });

  test('Related link should be fetched when no relationship data is present', function (assert) {
    assert.expect(3);
    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function (store, snapshot, url, relationship) {
      assert.strictEqual(url, 'author', 'url is correct');
      assert.ok(true, "The adapter's findBelongsTo method should be called");
      return resolve({
        data: {
          id: '1',
          type: 'author',
          attributes: { name: 'This is author' },
        },
      });
    };

    return run(() => {
      let book = store.push({
        data: {
          type: 'book',
          id: '1',
          relationships: {
            author: {
              links: {
                related: 'author',
              },
            },
          },
        },
      });

      return book.author.then((author) => {
        assert.strictEqual(author.name, 'This is author', 'author name is correct');
      });
    });
  });

  test('Related link should take precedence over relationship data if no local record data is available', async function (assert) {
    assert.expect(2);

    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function (store, snapshot, url, relationship) {
      assert.ok(true, "The adapter's findBelongsTo method should be called");
      return resolve({
        data: {
          id: '1',
          type: 'author',
          attributes: { name: 'This is author' },
        },
      });
    };

    adapter.findRecord = function () {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };

    let book = store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author',
            },
            data: { type: 'author', id: '1' },
          },
        },
      },
    });

    const author = await book.author;

    assert.strictEqual(author.name, 'This is author', 'author name is correct');
  });

  test('Relationship data should take precedence over related link when local record data is available', function (assert) {
    assert.expect(1);

    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => {
      return false;
    };
    adapter.findBelongsTo = function (store, snapshot, url, relationship) {
      assert.ok(false, "The adapter's findBelongsTo method should not be called");
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };

    return run(() => {
      let book = store.push({
        data: {
          type: 'book',
          id: '1',
          relationships: {
            author: {
              links: {
                related: 'author',
              },
              data: { type: 'author', id: '1' },
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'author',
            attributes: { name: 'This is author' },
          },
        ],
      });

      return book.author.then((author) => {
        assert.strictEqual(author.name, 'This is author', 'author name is correct');
      });
    });
  });

  test('New related link should take precedence over local data', function (assert) {
    assert.expect(3);

    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function (store, snapshot, url, relationship) {
      assert.strictEqual(url, 'author-new-link', 'url is correct');
      assert.ok(true, "The adapter's findBelongsTo method should be called");
      return resolve({
        data: {
          id: '1',
          type: 'author',
          attributes: { name: 'This is author' },
        },
      });
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };

    return run(() => {
      let book = store.push({
        data: {
          type: 'book',
          id: '1',
          relationships: {
            author: {
              data: {
                type: 'author',
                id: '1',
              },
            },
          },
        },
      });

      store.push({
        data: {
          type: 'book',
          id: '1',
          relationships: {
            author: {
              links: {
                related: 'author-new-link',
              },
            },
          },
        },
      });

      book.author.then((author) => {
        assert.strictEqual(author.name, 'This is author', 'author name is correct');
      });
    });
  });

  test('Updated related link should take precedence over relationship data and local record data', function (assert) {
    assert.expect(4);

    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function (store, snapshot, url, relationship) {
      assert.strictEqual(url, 'author-updated-link', 'url is correct');
      assert.ok(true, "The adapter's findBelongsTo method should be called");
      return resolve({
        data: {
          id: '1',
          type: 'author',
          attributes: {
            name: 'This is updated author',
          },
        },
      });
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };

    return run(() => {
      let book = store.push({
        data: {
          type: 'book',
          id: '1',
          relationships: {
            author: {
              links: {
                related: 'author',
              },
              data: { type: 'author', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'author',
            id: '1',
            attributes: {
              name: 'This is author',
            },
          },
        ],
      });

      return book.author
        .then((author) => {
          assert.strictEqual(author.name, 'This is author', 'author name is correct');
        })
        .then(() => {
          store.push({
            data: {
              type: 'book',
              id: '1',
              relationships: {
                author: {
                  links: {
                    related: 'author-updated-link',
                  },
                },
              },
            },
          });

          return book.author.then((author) => {
            assert.strictEqual(author.name, 'This is updated author', 'author name is correct');
          });
        });
    });
  });

  test('Updated identical related link should not take precedence over local data', function (assert) {
    assert.expect(2);

    class Book extends Model {
      @attr name;
      @belongsTo('author', { async: true, inverse: 'books' }) author;
      @hasMany('chapter', { async: false, inverse: 'book' }) chapters;
    }
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function () {
      assert.ok(false, "The adapter's findBelongsTo method should not be called");
    };

    adapter.findRecord = function () {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };

    return run(() => {
      let book = store.push({
        data: {
          type: 'book',
          id: '1',
          relationships: {
            author: {
              links: {
                related: 'author',
              },
              data: { type: 'author', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'author',
            id: '1',
            attributes: {
              name: 'This is author',
            },
          },
        ],
      });

      return book.author
        .then((author) => {
          assert.strictEqual(author.name, 'This is author', 'author name is correct');
        })
        .then(() => {
          store.push({
            data: {
              type: 'book',
              id: '1',
              relationships: {
                author: {
                  links: {
                    related: 'author',
                  },
                },
              },
            },
          });

          return book.author.then((author) => {
            assert.strictEqual(author.name, 'This is author', 'author name is correct');
          });
        });
    });
  });

  test('A belongsTo relationship can be reloaded using the reference if it was fetched via link', function (assert) {
    class Chapter extends Model {
      @attr title;
      @belongsTo('book', { async: true, inverse: 'chapters' }) book;
    }
    this.owner.register('model:chapter', Chapter);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function () {
      return resolve({
        data: {
          id: '1',
          type: 'chapter',
          relationships: {
            book: {
              links: { related: '/books/1' },
            },
          },
        },
      });
    };

    adapter.findBelongsTo = function () {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'book title' },
        },
      });
    };

    return run(() => {
      let chapter;

      return store
        .findRecord('chapter', 1)
        .then((_chapter) => {
          chapter = _chapter;

          return chapter.book;
        })
        .then((book) => {
          assert.strictEqual(book.name, 'book title');

          adapter.findBelongsTo = function () {
            return resolve({
              data: {
                id: '1',
                type: 'book',
                attributes: { name: 'updated book title' },
              },
            });
          };

          return chapter.belongsTo('book').reload();
        })
        .then((book) => {
          assert.strictEqual(book.name, 'updated book title');
        });
    });
  });

  test('A synchronous belongsTo relationship can be reloaded using a reference if it was fetched via id', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let chapter;
    run(() => {
      chapter = store.push({
        data: {
          type: 'chapter',
          id: '1',
          relationships: {
            book: {
              data: { type: 'book', id: '1' },
            },
          },
        },
      });
      store.push({
        data: {
          type: 'book',
          id: '1',
          attributes: {
            name: 'book title',
          },
        },
      });
    });

    adapter.findRecord = function () {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'updated book title' },
        },
      });
    };

    return run(() => {
      let book = chapter.book;
      assert.strictEqual(book.name, 'book title');

      return chapter
        .belongsTo('book')
        .reload()
        .then(function (book) {
          assert.strictEqual(book.name, 'updated book title');
        });
    });
  });

  test('A belongsTo relationship can be reloaded using a reference if it was fetched via id', function (assert) {
    class Chapter extends Model {
      @attr title;
      @belongsTo('book', { async: true, inverse: 'chapters' }) book;
    }
    this.owner.register('model:chapter', Chapter);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let chapter;
    run(() => {
      chapter = store.push({
        data: {
          type: 'chapter',
          id: '1',
          relationships: {
            book: {
              data: { type: 'book', id: '1' },
            },
          },
        },
      });
    });

    adapter.findRecord = function () {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'book title' },
        },
      });
    };

    return run(() => {
      return chapter.book
        .then((book) => {
          assert.strictEqual(book.name, 'book title');

          adapter.findRecord = function () {
            return resolve({
              data: {
                id: '1',
                type: 'book',
                attributes: { name: 'updated book title' },
              },
            });
          };

          return chapter.belongsTo('book').reload();
        })
        .then((book) => {
          assert.strictEqual(book.name, 'updated book title');
        });
    });
  });

  testInDebug('A belongsTo relationship warns if malformatted data is pushed into the store', function (assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      run(() => {
        let chapter = store.push({
          data: {
            type: 'chapter',
            id: '1',
            relationships: {
              book: {
                data: { id: '1', name: 'The Gallic Wars' },
              },
            },
          },
        });
        chapter.book;
      });
    }, /Encountered a relationship identifier without a type for the belongsTo relationship 'book' on <chapter:1>, expected an identifier with type 'book'/);
  });

  test("belongsTo relationship with links doesn't trigger extra change notifications - #4942", function (assert) {
    class Chapter extends Model {
      @attr title;
      @belongsTo('book', { async: true, inverse: 'chapters' }) book;
    }
    this.owner.register('model:chapter', Chapter);

    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: {
          type: 'chapter',
          id: '1',
          relationships: {
            book: {
              data: { type: 'book', id: '1' },
              links: { related: '/chapter/1/book' },
            },
          },
        },
        included: [{ type: 'book', id: '1' }],
      });
    });

    let chapter = store.peekRecord('chapter', '1');
    let count = 0;

    chapter.addObserver('book', () => {
      count++;
    });

    run(() => {
      chapter.book;
    });

    assert.strictEqual(count, 0);
  });
});
