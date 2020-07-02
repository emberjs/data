import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { setupContext, teardownContext } from '@ember/test-helpers';

import { module, test } from 'qunit';
import RSVP, { resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model from '@ember-data/model';
import { RecordData, relationshipsFor, relationshipStateFor } from '@ember-data/record-data/-private';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import { identifierCacheFor, recordDataFor } from '@ember-data/store/-private';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

const { attr: DSattr, hasMany: DShasMany, belongsTo: DSbelongsTo } = DS;
const { hash } = RSVP;
const { attr, belongsTo } = DS;

let store, User, Message, Post, Comment, Book, Book1, Chapter, Author, Section;

module('integration/relationship/belongs-to BelongsTo Relationships (new-style)', function(hooks) {
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

  hooks.beforeEach(function() {
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

  test("async belongsTo chains the related record's loading promise when present", async function(assert) {
    let petFindRecordCalls = 0;
    this.owner.register(
      'adapter:pet',
      JSONAPIAdapter.extend({
        findRecord() {
          assert.equal(++petFindRecordCalls, 1, 'We call findRecord only once for our pet');
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
          assert.equal(++personFindRecordCalls, 1, 'We call findRecord only once for our person');
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
    let personPetRequest = person.get('bestDog');
    let personPet = await personPetRequest;
    let pet = await petRequest;

    assert.ok(personPet === pet, 'We ended up in the same state');
  });

  test('async belongsTo returns correct new value after a local change', async function(assert) {
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
    let bestDog = await chris.get('bestDog');

    assert.ok(shen.get('bestHuman') === null, 'precond - Shen has no best human');
    assert.ok(pirate.get('bestHuman') === null, 'precond - pirate has no best human');
    assert.ok(bestDog === null, 'precond - Chris has no best dog');

    chris.set('bestDog', shen);
    bestDog = await chris.get('bestDog');

    assert.ok(shen.get('bestHuman') === chris, "scene 1 - Chris is Shen's best human");
    assert.ok(pirate.get('bestHuman') === null, 'scene 1 - pirate has no best human');
    assert.ok(bestDog === shen, "scene 1 - Shen is Chris's best dog");

    chris.set('bestDog', pirate);
    bestDog = await chris.get('bestDog');

    assert.ok(shen.get('bestHuman') === null, "scene 2 - Chris is no longer Shen's best human");
    assert.ok(pirate.get('bestHuman') === chris, 'scene 2 - pirate now has Chris as best human');
    assert.ok(bestDog === pirate, "scene 2 - Pirate is now Chris's best dog");

    chris.set('bestDog', null);
    bestDog = await chris.get('bestDog');

    assert.ok(shen.get('bestHuman') === null, "scene 3 - Chris remains no longer Shen's best human");
    assert.ok(pirate.get('bestHuman') === null, 'scene 3 - pirate no longer has Chris as best human');
    assert.ok(bestDog === null, 'scene 3 - Chris has no best dog');
  });
});

module('integration/relationship/belongs_to Belongs-To Relationships', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    User = DS.Model.extend({
      name: DSattr('string'),
      messages: DShasMany('message', { polymorphic: true, async: false }),
      favouriteMessage: DSbelongsTo('message', { polymorphic: true, inverse: null, async: false }),
    });

    Message = DS.Model.extend({
      user: DSbelongsTo('user', { inverse: 'messages', async: false }),
      created_at: DSattr('date'),
    });

    Post = Message.extend({
      title: DSattr('string'),
      comments: DShasMany('comment', { async: false, inverse: null }),
    });

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('message', { polymorphic: true, async: false, inverse: null }),
    });

    Book = DS.Model.extend({
      name: DSattr('string'),
      author: DSbelongsTo('author', { async: false }),
      chapters: DShasMany('chapters', { async: false, inverse: 'book' }),
    });

    Book1 = DS.Model.extend({
      name: DSattr('string'),
    });

    Chapter = DS.Model.extend({
      title: DSattr('string'),
      book: DSbelongsTo('book', { async: false, inverse: 'chapters' }),
    });

    Author = DS.Model.extend({
      name: DSattr('string'),
      books: DShasMany('books', { async: false }),
    });

    Section = DS.Model.extend({
      name: DSattr('string'),
    });

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
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          favouriteMessage: { embedded: 'always' },
        },
      })
    );

    store = this.owner.lookup('service:store');

    User = store.modelFor('user');
    Post = store.modelFor('post');
    Comment = store.modelFor('comment');
    Message = store.modelFor('message');
    Book = store.modelFor('book');
    Chapter = store.modelFor('chapter');
    Author = store.modelFor('author');
  });

  test('returning a null relationship from payload sets the relationship to null on both sides', function(assert) {
    this.owner.register(
      'model:app',
      DS.Model.extend({
        name: DSattr('string'),
        team: DSbelongsTo('team', { async: true }),
      })
    );
    this.owner.register(
      'model:team',
      DS.Model.extend({
        apps: DShasMany('app', { async: true }),
      })
    );

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    run(() => {
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
    });

    const app = store.peekRecord('app', '1');
    const team = store.peekRecord('team', '1');
    assert.equal(app.get('team.id'), team.get('id'), 'sets team correctly on app');
    assert.deepEqual(
      team
        .get('apps')
        .toArray()
        .mapBy('id'),
      ['1'],
      'sets apps correctly on team'
    );

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = (store, type, snapshot) => {
      return RSVP.resolve({
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

    return run(() => {
      app.set('name', 'Hello');
      return app.save().then(() => {
        assert.equal(app.get('team.id'), null, 'team removed from app relationship');
        assert.deepEqual(
          team
            .get('apps')
            .toArray()
            .mapBy('id'),
          [],
          'app removed from team apps relationship'
        );
      });
    });
  });

  test('The store can materialize a non loaded monomorphic belongsTo association', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.modelFor('post').reopen({
      user: DS.belongsTo('user', {
        async: true,
        inverse: 'messages',
      }),
    });

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = function(store, type, id, snapshot) {
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
      return store.findRecord('post', 1).then(post => {
        post.get('user');
      });
    });
  });

  testInDebug('Invalid belongsTo relationship identifiers throw errors', function(assert) {
    assert.expect(2);

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
        post.get('user');
      });
    }, `Assertion Failed: Encountered a relationship identifier without an id for the belongsTo relationship 'user' on <post:1>, expected a json-api identifier but found '{"id":null,"type":"user"}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`);

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
        post.get('user');
      });
    }, `Assertion Failed: Encountered a relationship identifier without a type for the belongsTo relationship 'user' on <post:2>, expected a json-api identifier with type 'user' but found '{"id":"1","type":null}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`);
  });

  testInDebug('Only a record of the same modelClass can be used with a monomorphic belongsTo relationship', function(
    assert
  ) {
    assert.expect(1);

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
        },
      });
    });

    return run(() => {
      return hash({
        post: store.findRecord('post', 1),
        comment: store.findRecord('comment', 2),
      }).then(records => {
        assert.expectAssertion(() => {
          records.post.set('user', records.comment);
        }, /The 'comment' type does not implement 'user' and thus cannot be assigned to the 'user' relationship in 'post'/);
      });
    });
  });

  testInDebug(
    'Only a record of the same base modelClass can be used with a polymorphic belongsTo relationship',
    function(assert) {
      assert.expect(1);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;

      run(() => {
        store.push({
          data: [
            {
              id: '1',
              type: 'comment',
            },
            {
              id: '2',
              type: 'comment',
            },
          ],
        });
        store.push({
          data: {
            id: '1',
            type: 'post',
          },
        });
        store.push({
          data: {
            id: '3',
            type: 'user',
          },
        });
      });

      return run(() => {
        let asyncRecords = hash({
          user: store.findRecord('user', 3),
          post: store.findRecord('post', 1),
          comment: store.findRecord('comment', 1),
          anotherComment: store.findRecord('comment', 2),
        });

        return asyncRecords.then(records => {
          let comment = records.comment;

          comment.set('message', records.anotherComment);
          comment.set('message', records.post);
          comment.set('message', null);

          assert.expectAssertion(() => {
            comment.set('message', records.user);
          }, /The 'user' type does not implement 'message' and thus cannot be assigned to the 'message' relationship in 'comment'. Make it a descendant of 'message'/);
        });
      });
    }
  );

  test('The store can load a polymorphic belongsTo association', function(assert) {
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
      }).then(records => {
        assert.equal(records.comment.get('message'), records.message);
      });
    });
  });

  test('The store can serialize a polymorphic belongsTo association', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let serializerInstance = store.serializerFor('comment');

    serializerInstance.serializePolymorphicType = function(record, json, relationship) {
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

      return store.findRecord('comment', 2).then(comment => {
        let serialized = comment.serialize({ includeId: true });
        assert.equal(serialized.data.relationships.message.data.id, 1);
        assert.equal(serialized.data.relationships.message.data.type, 'posts');
      });
    });
  });

  test('A serializer can materialize a belongsTo as a link that gets sent back to findBelongsTo', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let Group = DS.Model.extend({
      people: DS.hasMany('person', { async: false }),
    });

    let Person = DS.Model.extend({
      group: DS.belongsTo({ async: true }),
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

    adapter.findRecord = function(store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.findBelongsTo = function(store, snapshot, link, relationship) {
      assert.equal(relationship.type, 'group');
      assert.equal(relationship.key, 'group');
      assert.equal(link, '/people/1/group');

      return resolve({
        data: {
          id: 1,
          type: 'group',
          relationships: {
            people: {
              data: [{ id: 1, type: 'person' }],
            },
          },
        },
      });
    };

    return run(() => {
      return store
        .findRecord('person', 1)
        .then(person => {
          return person.get('group');
        })
        .then(group => {
          assert.ok(group instanceof Group, 'A group object is loaded');
          assert.ok(group.get('id') === '1', 'It is the group we are expecting');
        });
    });
  });

  test('A record with an async belongsTo relationship always returns a promise for that relationship', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let Seat = DS.Model.extend({
      person: DS.belongsTo('person', { async: false }),
    });

    let Person = DS.Model.extend({
      seat: DS.belongsTo('seat', { async: true }),
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

    adapter.findRecord = function(store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.findBelongsTo = function(store, snapshot, link, relationship) {
      return resolve({ data: { id: 1, type: 'seat' } });
    };

    return run(() => {
      return store.findRecord('person', 1).then(person => {
        return person.get('seat').then(seat => {
          // this assertion fails too
          // ok(seat.get('person') === person, 'parent relationship should be populated');
          seat.set('person', person);
          assert.ok(person.get('seat').then, 'seat should be a PromiseObject');
        });
      });
    });
  });

  test('A record with an async belongsTo relationship returning null should resolve null', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let Group = DS.Model.extend({
      people: DS.hasMany('person', { async: false }),
    });

    let Person = DS.Model.extend({
      group: DS.belongsTo({ async: true }),
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

    adapter.findRecord = function(store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.findBelongsTo = function(store, snapshot, link, relationship) {
      return resolve({ data: null });
    };

    return store
      .findRecord('person', '1')
      .then(person => {
        return person.get('group');
      })
      .then(group => {
        assert.ok(group === null, 'group should be null');
      });
  });

  test('A record can be created with a resolved belongsTo promise', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    let Group = DS.Model.extend({
      people: DS.hasMany('person', { async: false }),
    });

    let Person = DS.Model.extend({
      group: DS.belongsTo({ async: true }),
    });

    this.owner.register('model:group', Group);
    this.owner.register('model:person', Person);

    run(() => {
      store.push({
        data: {
          id: 1,
          type: 'group',
        },
      });
    });

    let groupPromise = store.findRecord('group', 1);
    return groupPromise.then(group => {
      let person = store.createRecord('person', {
        group: groupPromise,
      });
      assert.equal(person.get('group.content'), group);
    });
  });

  test('polymorphic belongsTo class-checks check the superclass', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    run(() => {
      let igor = store.createRecord('user', { name: 'Igor' });
      let post = store.createRecord('post', { title: "Igor's unimaginative blog post" });

      igor.set('favouriteMessage', post);

      assert.equal(igor.get('favouriteMessage.title'), "Igor's unimaginative blog post");
    });
  });

  test('the subclass in a polymorphic belongsTo relationship is an instanceof its superclass', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let message = store.createRecord('message', { id: 1 });
    let comment = store.createRecord('comment', { id: 2, message: message });

    assert.ok(comment instanceof Message, 'a comment is an instance of a message');
  });

  test('relationshipsByName does not cache a factory', async function(assert) {
    // The model is loaded up via a container. It has relationshipsByName
    // called on it.
    let modelViaFirstFactory = this.owner.lookup('service:store').modelFor('user');
    get(modelViaFirstFactory, 'relationshipsByName');

    // An app is reset, or the container otherwise destroyed.
    await teardownContext(this);
    await setupContext(this);

    // A new model for a relationship is created.
    const NewMessage = Message.extend();

    this.owner.register('model:message', NewMessage);
    this.owner.register('model:user', User);

    // A new store is created.
    let store = this.owner.lookup('service:store');

    // relationshipsByName is called again.
    let modelViaSecondFactory = store.modelFor('user');
    let relationshipsByName = get(modelViaSecondFactory, 'relationshipsByName');
    let messageType = relationshipsByName.get('messages').type;

    // A model is looked up in the store based on a string, via user input
    let messageModelFromStore = store.modelFor('message');
    // And the model is lookup up internally via the relationship type
    let messageModelFromRelationType = store.modelFor(messageType);

    assert.equal(
      messageModelFromRelationType,
      messageModelFromStore,
      'model factory based on relationship type matches the model based on store.modelFor'
    );
  });

  test('relationship changes shouldn’t cause async fetches', function(assert) {
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

    store.modelFor('post').reopen({
      comments: DS.hasMany('comment', {
        async: true,
        inverse: 'post',
      }),
    });

    store.modelFor('comment').reopen({
      post: DS.belongsTo('post', { async: false }),
    });

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

    adapter.deleteRecord = function(store, type, snapshot) {
      assert.ok(snapshot.record instanceof type);
      assert.equal(snapshot.id, 1, 'should first comment');
      return {
        data: {
          id: snapshot.record.id,
          type: 'comment',
        },
      };
    };

    adapter.findMany = function(store, type, ids, snapshots) {
      assert.ok(false, 'should not need to findMay more comments, but attempted to anyways');
    };

    run(comment, 'destroyRecord');
  });

  test('Destroying a record with an unloaded aync belongsTo association does not fetch the record', function(assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post;

    store.modelFor('message').reopen({
      user: DS.hasMany('user', {
        async: true,
      }),
    });

    store.modelFor('post').reopen({
      user: DS.belongsTo('user', {
        async: true,
        inverse: 'messages',
      }),
    });

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

    adapter.findRecord = function(store, type, id, snapshot) {
      throw new Error("Adapter's find method should not be called");
    };

    adapter.deleteRecord = function(store, type, snapshot) {
      assert.ok(snapshot.record instanceof type);
      assert.equal(snapshot.id, 1, 'should first post');
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

  testInDebug('A sync belongsTo errors out if the record is unloaded', function(assert) {
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
      message.get('user');
    }, /You looked up the 'user' relationship on a 'message' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`belongsTo\({ async: true }\)`\)/);
  });

  test('Rollbacking attributes for a deleted record restores implicit relationship - async', function(assert) {
    Book.reopen({
      author: DS.belongsTo('author', { async: true }),
    });

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

      return book.get('author').then(fetchedAuthor => {
        assert.equal(fetchedAuthor, author, 'Book has an author after rollback attributes');
      });
    });
  });

  test('Rollbacking attributes for a deleted record restores implicit relationship - sync', function(assert) {
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

    assert.equal(book.get('author'), author, 'Book has an author after rollback attributes');
  });

  testInDebug('Passing a model as type to belongsTo should not work', function(assert) {
    assert.expect(1);

    assert.expectAssertion(() => {
      User = DS.Model.extend();

      DS.Model.extend({
        user: DSbelongsTo(User, { async: false }),
      });
    }, /The first argument to belongsTo must be a string/);
  });

  test('belongsTo hasAnyRelationshipData async loaded', function(assert) {
    assert.expect(1);

    Book.reopen({
      author: DSbelongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function(store, type, id, snapshot) {
      return resolve({
        data: {
          id: 1,
          type: 'book',
          attributes: { name: 'The Greatest Book' },
          relationships: {
            author: { data: { id: 2, type: 'author' } },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then(book => {
        let relationship = relationshipStateFor(book, 'author');
        assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData sync loaded', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function(store, type, id, snapshot) {
      return resolve({
        data: {
          id: 1,
          type: 'book',
          attributes: { name: 'The Greatest Book' },
          relationships: {
            author: { data: { id: 2, type: 'author' } },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then(book => {
        let relationship = relationshipStateFor(book, 'author');
        assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData async not loaded', function(assert) {
    assert.expect(1);

    Book.reopen({
      author: DSbelongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function(store, type, id, snapshot) {
      return resolve({
        data: {
          id: 1,
          type: 'book',
          attributes: { name: 'The Greatest Book' },
          relationships: {
            author: { links: { related: 'author' } },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then(book => {
        let relationship = relationshipStateFor(book, 'author');
        assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData sync not loaded', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function(store, type, id, snapshot) {
      return resolve({
        data: {
          id: 1,
          type: 'book',
          attributes: { name: 'The Greatest Book' },
        },
      });
    };

    return run(() => {
      return store.findRecord('book', 1).then(book => {
        let relationship = relationshipStateFor(book, 'author');
        assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');
      });
    });
  });

  test('belongsTo hasAnyRelationshipData NOT created', function(assert) {
    assert.expect(2);

    Book.reopen({
      author: DSbelongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');

    run(() => {
      let author = store.createRecord('author');
      let book = store.createRecord('book', { name: 'The Greatest Book' });
      let relationship = relationshipStateFor(book, 'author');

      assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');

      book = store.createRecord('book', {
        name: 'The Greatest Book',
        author,
      });

      relationship = relationshipStateFor(book, 'author');

      assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
    });
  });

  test('belongsTo hasAnyRelationshipData sync created', function(assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');

    run(() => {
      let author = store.createRecord('author');
      let book = store.createRecord('book', {
        name: 'The Greatest Book',
      });

      let relationship = relationshipStateFor(book, 'author');
      assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');

      book = store.createRecord('book', {
        name: 'The Greatest Book',
        author,
      });

      relationship = relationshipStateFor(book, 'author');
      assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
    });
  });

  test("Model's belongsTo relationship should not be created during model creation", function(assert) {
    let store = this.owner.lookup('service:store');
    let user;

    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
        },
      });

      assert.ok(!relationshipsFor(user).has('favouriteMessage'), 'Newly created record should not have relationships');
    });
  });

  test("Model's belongsTo relationship should be created during model creation if relationship passed in constructor", function(assert) {
    let store = this.owner.lookup('service:store');
    let message = store.createRecord('message');
    let user = store.createRecord('user', {
      name: 'John Doe',
      favouriteMessage: message,
    });

    assert.ok(
      relationshipsFor(user).has('favouriteMessage'),
      'Newly created record with relationships in params passed in its constructor should have relationships'
    );
  });

  test("Model's belongsTo relationship should be created during 'set' method", function(assert) {
    let store = this.owner.lookup('service:store');
    let user, message;

    run(() => {
      message = store.createRecord('message');
      user = store.createRecord('user');
      user.set('favouriteMessage', message);
      assert.ok(
        relationshipsFor(user).has('favouriteMessage'),
        'Newly created record with relationships in params passed in its constructor should have relationships'
      );
    });
  });

  test("Model's belongsTo relationship should be created during 'get' method", function(assert) {
    let store = this.owner.lookup('service:store');
    let user;

    run(() => {
      user = store.createRecord('user');
      user.get('favouriteMessage');
      assert.ok(
        relationshipsFor(user).has('favouriteMessage'),
        'Newly created record with relationships in params passed in its constructor should have relationships'
      );
    });
  });

  test('Related link should be fetched when no relationship data is present', function(assert) {
    assert.expect(3);

    Book.reopen({
      author: DS.belongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function(store, snapshot, url, relationship) {
      assert.equal(url, 'author', 'url is correct');
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

      return book.get('author').then(author => {
        assert.equal(author.get('name'), 'This is author', 'author name is correct');
      });
    });
  });

  test('Related link should take precedence over relationship data if no local record data is available', async function(assert) {
    assert.expect(2);

    Book.reopen({
      author: DS.belongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function(store, snapshot, url, relationship) {
      assert.ok(true, "The adapter's findBelongsTo method should be called");
      return resolve({
        data: {
          id: 1,
          type: 'author',
          attributes: { name: 'This is author' },
        },
      });
    };

    adapter.findRecord = function() {
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

    const author = await book.get('author');

    assert.equal(author.get('name'), 'This is author', 'author name is correct');
  });

  test('Relationship data should take precedence over related link when local record data is available', function(assert) {
    assert.expect(1);

    Book.reopen({
      author: DS.belongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => {
      return false;
    };
    adapter.findBelongsTo = function(store, snapshot, url, relationship) {
      assert.ok(false, "The adapter's findBelongsTo method should not be called");
    };

    adapter.findRecord = function(store, type, id, snapshot) {
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

      return book.get('author').then(author => {
        assert.equal(author.get('name'), 'This is author', 'author name is correct');
      });
    });
  });

  test('New related link should take precedence over local data', function(assert) {
    assert.expect(3);

    Book.reopen({
      author: DS.belongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function(store, snapshot, url, relationship) {
      assert.equal(url, 'author-new-link', 'url is correct');
      assert.ok(true, "The adapter's findBelongsTo method should be called");
      return resolve({
        data: {
          id: 1,
          type: 'author',
          attributes: { name: 'This is author' },
        },
      });
    };

    adapter.findRecord = function(store, type, id, snapshot) {
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

      book.get('author').then(author => {
        assert.equal(author.get('name'), 'This is author', 'author name is correct');
      });
    });
  });

  test('Updated related link should take precedence over relationship data and local record data', function(assert) {
    assert.expect(4);

    Book.reopen({
      author: DS.belongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function(store, snapshot, url, relationship) {
      assert.equal(url, 'author-updated-link', 'url is correct');
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

    adapter.findRecord = function(store, type, id, snapshot) {
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

      return book
        .get('author')
        .then(author => {
          assert.equal(author.get('name'), 'This is author', 'author name is correct');
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

          return book.get('author').then(author => {
            assert.equal(author.get('name'), 'This is updated author', 'author name is correct');
          });
        });
    });
  });

  test('Updated identical related link should not take precedence over local data', function(assert) {
    assert.expect(2);

    Book.reopen({
      author: DS.belongsTo('author', { async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findBelongsTo = function() {
      assert.ok(false, "The adapter's findBelongsTo method should not be called");
    };

    adapter.findRecord = function() {
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

      return book
        .get('author')
        .then(author => {
          assert.equal(author.get('name'), 'This is author', 'author name is correct');
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

          return book.get('author').then(author => {
            assert.equal(author.get('name'), 'This is author', 'author name is correct');
          });
        });
    });
  });

  test('A belongsTo relationship can be reloaded using the reference if it was fetched via link', function(assert) {
    Chapter.reopen({
      book: DS.belongsTo({ async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function() {
      return resolve({
        data: {
          id: 1,
          type: 'chapter',
          relationships: {
            book: {
              links: { related: '/books/1' },
            },
          },
        },
      });
    };

    adapter.findBelongsTo = function() {
      return resolve({
        data: {
          id: 1,
          type: 'book',
          attributes: { name: 'book title' },
        },
      });
    };

    return run(() => {
      let chapter;

      return store
        .findRecord('chapter', 1)
        .then(_chapter => {
          chapter = _chapter;

          return chapter.get('book');
        })
        .then(book => {
          assert.equal(book.get('name'), 'book title');

          adapter.findBelongsTo = function() {
            return resolve({
              data: {
                id: 1,
                type: 'book',
                attributes: { name: 'updated book title' },
              },
            });
          };

          return chapter.belongsTo('book').reload();
        })
        .then(book => {
          assert.equal(book.get('name'), 'updated book title');
        });
    });
  });

  test('A synchronous belongsTo relationship can be reloaded using a reference if it was fetched via id', function(assert) {
    Chapter.reopen({
      book: DS.belongsTo({ async: false }),
    });

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

    adapter.findRecord = function() {
      return resolve({
        data: {
          id: '1',
          type: 'book',
          attributes: { name: 'updated book title' },
        },
      });
    };

    return run(() => {
      let book = chapter.get('book');
      assert.equal(book.get('name'), 'book title');

      return chapter
        .belongsTo('book')
        .reload()
        .then(function(book) {
          assert.equal(book.get('name'), 'updated book title');
        });
    });
  });

  test('A belongsTo relationship can be reloaded using a reference if it was fetched via id', function(assert) {
    Chapter.reopen({
      book: DS.belongsTo({ async: true }),
    });

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let chapter;
    run(() => {
      chapter = store.push({
        data: {
          type: 'chapter',
          id: 1,
          relationships: {
            book: {
              data: { type: 'book', id: 1 },
            },
          },
        },
      });
    });

    adapter.findRecord = function() {
      return resolve({
        data: {
          id: 1,
          type: 'book',
          attributes: { name: 'book title' },
        },
      });
    };

    return run(() => {
      return chapter
        .get('book')
        .then(book => {
          assert.equal(book.get('name'), 'book title');

          adapter.findRecord = function() {
            return resolve({
              data: {
                id: 1,
                type: 'book',
                attributes: { name: 'updated book title' },
              },
            });
          };

          return chapter.belongsTo('book').reload();
        })
        .then(book => {
          assert.equal(book.get('name'), 'updated book title');
        });
    });
  });

  testInDebug('A belongsTo relationship warns if malformatted data is pushed into the store', function(assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      run(() => {
        let chapter = store.push({
          data: {
            type: 'chapter',
            id: 1,
            relationships: {
              book: {
                data: { id: 1, name: 'The Gallic Wars' },
              },
            },
          },
        });
        chapter.get('book');
      });
    }, /Encountered a relationship identifier without a type for the belongsTo relationship 'book' on <chapter:1>, expected a json-api identifier with type 'book'/);
  });

  test("belongsTo relationship with links doesn't trigger extra change notifications - #4942", function(assert) {
    Chapter.reopen({
      book: DS.belongsTo({ async: true }),
    });

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
      chapter.get('book');
    });

    assert.equal(count, 0);
  });

  test("belongsTo relationship doesn't trigger when model data doesn't support implicit relationship", function(assert) {
    class TestRecordData extends RecordData {
      constructor(...args) {
        super(...args);
        delete this.__implicitRelationships;
        delete this.__relationships;
      }

      _destroyRelationships() {}

      _allRelatedRecordDatas() {
        return [this];
      }

      _cleanupOrphanedRecordDatas() {}

      destroy() {
        this.isDestroyed = true;
        this.storeWrapper.disconnectRecord(this.modelName, this.id, this.clientId);
      }

      get _implicitRelationships() {
        return undefined;
      }
      get _relationships() {
        return undefined;
      }
    }

    Chapter.reopen({
      // book is still an inverse from prior to the reopen
      sections: DS.hasMany('section', { async: false }),
      book1: DS.belongsTo('book1', { async: false, inverse: 'chapters' }), // incorrect inverse
      book2: DS.belongsTo('book1', { async: false, inverse: null }), // correct inverse
    });

    let store = this.owner.lookup('service:store');

    const createRecordDataFor = store.createRecordDataFor;
    store.createRecordDataFor = function(modelName, id, lid, storeWrapper) {
      if (modelName === 'book1' || modelName === 'section') {
        let identifier = identifierCacheFor(this).getOrCreateRecordIdentifier({
          type: modelName,
          id,
          lid,
        });
        return new TestRecordData(identifier, storeWrapper);
      }
      return createRecordDataFor.call(this, modelName, id, lid, storeWrapper);
    };

    const data = {
      data: {
        type: 'chapter',
        id: '1',
        relationships: {
          book1: {
            data: { type: 'book1', id: '1' },
          },
          book2: {
            data: { type: 'book1', id: '2' },
          },
          book: {
            data: { type: 'book', id: '1' },
          },
          sections: {
            data: [
              {
                type: 'section',
                id: 1,
              },
              {
                type: 'section',
                id: 2,
              },
            ],
          },
        },
      },
      included: [
        { type: 'book1', id: '1' },
        { type: 'book1', id: '2' },
        { type: 'section', id: '1' },
        { type: 'book', id: '1' },
        { type: 'section', id: '2' },
      ],
    };

    // Expect assertion failure as Book1 RecordData
    // doesn't have relationship attribute
    // and inverse is not set to null in
    // DSbelongsTo
    assert.expectAssertion(() => {
      run(() => {
        store.push(data);
      });
    }, `Assertion Failed: We found no inverse relationships by the name of 'chapters' on the 'book1' model. This is most likely due to a missing attribute on your model definition.`);

    //Update setup
    // with inverse set to null
    // no errors thrown
    Chapter.reopen({
      book1: DS.belongsTo({ async: false }),
      sections: DS.hasMany('section', { async: false }),
      book: DS.belongsTo({ async: false, inverse: null }),
    });

    run(() => {
      store.push(data);
    });

    let chapter = store.peekRecord('chapter', '1');
    let book1 = store.peekRecord('book1', '1');
    let book2 = store.peekRecord('book1', '2');
    let book = store.peekRecord('book', '1');
    let section1 = store.peekRecord('section', '1');
    let section2 = store.peekRecord('section', '2');

    let sections = chapter.get('sections');

    assert.equal(chapter.get('book1.id'), '1');
    assert.equal(chapter.get('book2.id'), '2');
    assert.equal(chapter.get('book.id'), '1');

    // No inverse setup created for book1
    // as Model-Data of book1 doesn't support this
    // functionality.
    assert.notOk(book1.get('chapter'));
    assert.notOk(book2.get('chapter'));
    assert.notOk(book.get('chapter'));
    assert.notOk(
      recordDataFor(book1)._implicitRelationships,
      'no support for implicit relationship in custom RecordData'
    );
    assert.notOk(
      recordDataFor(book2)._implicitRelationships,
      'no support for implicit relationship in custom RecordData'
    );
    assert.ok(recordDataFor(book)._implicitRelationships, 'support for implicit relationship in default RecordData');

    // No inverse setup is created for section
    assert.notOk(section1.get('chapter'));
    assert.notOk(section2.get('chapter'));

    // Removing the sections
    // shouldnot throw error
    // as Model-data of section
    // doesn't support implicit Relationship
    run(() => {
      chapter.get('sections').removeObject(section1);
      assert.notOk(recordDataFor(section1)._implicitRelationships);

      chapter.get('sections').removeObject(section2);
      assert.notOk(recordDataFor(section2)._implicitRelationships);
    });

    assert.equal(chapter.get('sections.length'), 0);

    // Update the current state of chapter by
    // adding new sections
    // shouldnot throw error during
    // setup of implicit inverse
    run(() => {
      sections.addObject(store.createRecord('section', { id: 3 }));
      sections.addObject(store.createRecord('section', { id: 4 }));
      sections.addObject(store.createRecord('section', { id: 5 }));
    });
    assert.equal(chapter.get('sections.length'), 3);
    assert.notOk(recordDataFor(sections.get('firstObject'))._implicitRelationships);
  });
});
