import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/embedded-records-mixin', function (hooks) {
  setupTest(hooks);
  let store;

  class SuperVillain extends Model {
    @attr('string') firstName;
    @attr('string') lastName;
    @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
    @belongsTo('secret-lab', { async: false, inverse: 'superVillain' }) secretLab;
    @hasMany('secret-weapon', { async: false, inverse: 'superVillain' }) secretWeapons;
    @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
  }
  class HomePlanet extends Model {
    @attr('string') name;
    @hasMany('super-villain', { inverse: 'homePlanet', async: false }) villains;
  }
  class SecretLab extends Model {
    @attr('number') minionCapacity;
    @attr('string') vicinity;
    @belongsTo('super-villain', { async: false, inverse: 'secretLab', as: 'secret-lab' }) superVillain;
  }
  class BatCave extends SecretLab {
    @attr('boolean') infiltrated;
  }
  class SecretWeapon extends Model {
    @attr('string') name;
    @belongsTo('super-villain', { async: false, inverse: 'secretWeapons', as: 'secret-weapon' }) superVillain;
  }
  class LightSaber extends SecretWeapon {
    @attr('string') color;
  }
  class EvilMinion extends Model {
    @belongsTo('super-villain', { async: false, inverse: 'evilMinions' }) superVillain;
    @attr('string') name;
  }
  class Comment extends Model {
    @attr('string') body;
    @attr('boolean') root;
    @hasMany('comment', { inverse: null, async: false }) children;
  }

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:super-villain', SuperVillain);
    owner.register('model:home-planet', HomePlanet);
    owner.register('model:secret-lab', SecretLab);
    owner.register('model:bat-cave', BatCave);
    owner.register('model:secret-weapon', SecretWeapon);
    owner.register('model:light-saber', LightSaber);
    owner.register('model:evil-minion', EvilMinion);
    owner.register('model:comment', Comment);

    owner.register('adapter:application', RESTAdapter);
    owner.register('serializer:application', RESTSerializer.extend(EmbeddedRecordsMixin));

    store = owner.lookup('service:store');
  });

  module('Normalize using findRecord', function () {
    test('normalizeResponse with embedded objects', async function (assert) {
      this.owner.register(
        'serializer:home-planet',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            villains: { embedded: 'always' },
          },
        })
      );
      const serializer = store.serializerFor('home-planet');
      const HomePlanet = store.modelFor('home-planet');
      const rawPayload = {
        homePlanet: {
          id: '1',
          name: 'Umber',
          villains: [
            {
              id: '2',
              firstName: 'Tom',
              lastName: 'Dale',
            },
          ],
        },
      };

      const normalizedJsonApi = serializer.normalizeResponse(store, HomePlanet, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'home-planet',
          attributes: {
            name: 'Umber',
          },
          relationships: {
            villains: {
              data: [{ id: '2', type: 'super-villain' }],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
              lastName: 'Dale',
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(normalizedJsonApi, expectedOutput, 'We normalized to json-api and extracted the super-villain');
    });

    test('normalizeResponse with embedded objects inside embedded objects', async function (assert) {
      this.owner.register(
        'serializer:home-planet',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            villains: { embedded: 'always' },
          },
        })
      );
      this.owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            evilMinions: { embedded: 'always' },
          },
        })
      );

      const serializer = store.serializerFor('home-planet');
      const HomePlanet = store.modelFor('home-planet');
      const rawPayload = {
        homePlanet: {
          id: '1',
          name: 'Umber',
          villains: [
            {
              id: '2',
              firstName: 'Tom',
              lastName: 'Dale',
              evilMinions: [
                {
                  id: '3',
                  name: 'Alex',
                },
              ],
            },
          ],
        },
      };

      const normalizedJsonApi = serializer.normalizeResponse(store, HomePlanet, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'home-planet',
          attributes: {
            name: 'Umber',
          },
          relationships: {
            villains: {
              data: [{ id: '2', type: 'super-villain' }],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
              lastName: 'Dale',
            },
            relationships: {
              evilMinions: {
                data: [{ id: '3', type: 'evil-minion' }],
              },
            },
          },
          {
            id: '3',
            type: 'evil-minion',
            attributes: {
              name: 'Alex',
            },
            relationships: {},
          },
        ],
      };
      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'We normalized to json-api and extracted embedded records two levels deep'
      );
    });

    test('normalizeResponse with embedded objects of same type', async function (assert) {
      this.owner.register(
        'serializer:comment',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            children: { embedded: 'always' },
          },
        })
      );

      const serializer = store.serializerFor('comment');
      const Comment = store.modelFor('comment');
      const rawPayload = {
        comment: {
          id: '1',
          body: 'Hello',
          root: true,
          children: [
            {
              id: '2',
              body: 'World',
              root: false,
            },
            {
              id: '3',
              body: 'Foo',
              root: false,
            },
          ],
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, Comment, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'comment',
          attributes: {
            body: 'Hello',
            root: true,
          },
          relationships: {
            children: {
              data: [
                { id: '2', type: 'comment' },
                { id: '3', type: 'comment' },
              ],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'comment',
            attributes: {
              body: 'World',
              root: false,
            },
            relationships: {},
          },
          {
            id: '3',
            type: 'comment',
            attributes: {
              body: 'Foo',
              root: false,
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'We normalized to json-api keeping the primary record in data and the related record of the same type in included'
      );
    });

    test('normalizeResponse with embedded objects inside embedded objects of same type', async function (assert) {
      this.owner.register(
        'serializer:comment',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            children: { embedded: 'always' },
          },
        })
      );

      const serializer = store.serializerFor('comment');
      const Comment = store.modelFor('comment');
      const rawPayload = {
        comment: {
          id: '1',
          body: 'Hello',
          root: true,
          children: [
            {
              id: '2',
              body: 'World',
              root: false,
              children: [
                {
                  id: '4',
                  body: 'Another',
                  root: false,
                },
              ],
            },
            {
              id: '3',
              body: 'Foo',
              root: false,
            },
          ],
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, Comment, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'comment',
          attributes: {
            body: 'Hello',
            root: true,
          },
          relationships: {
            children: {
              data: [
                { id: '2', type: 'comment' },
                { id: '3', type: 'comment' },
              ],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'comment',
            attributes: {
              body: 'World',
              root: false,
            },
            relationships: {
              children: {
                data: [{ id: '4', type: 'comment' }],
              },
            },
          },
          {
            id: '4',
            type: 'comment',
            attributes: {
              body: 'Another',
              root: false,
            },
            relationships: {},
          },
          {
            id: '3',
            type: 'comment',
            attributes: {
              body: 'Foo',
              root: false,
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'We normalized to json-api keeping the primary record in data and the related record of the same type in included multiple levels deep'
      );
    });

    test('normalizeResponse with embedded objects of same type, but from separate attributes', async function (assert) {
      let { owner } = this;
      class HomePlanetKlass extends Model {
        @attr('string') name;
        @hasMany('super-villain', { inverse: 'homePlanet', async: false }) villains;
        @hasMany('superVillain', { inverse: null, async: false }) reformedVillains;
      }
      owner.unregister('model:home-planet');
      owner.register('model:home-planet', HomePlanetKlass);
      owner.register(
        'serializer:home-planet',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            villains: { embedded: 'always' },
            reformedVillains: { embedded: 'always' },
          },
        })
      );

      const serializer = store.serializerFor('home-planet');
      const HomePlanet = store.modelFor('home-planet');
      const rawPayload = {
        homePlanet: {
          id: '1',
          name: 'Earth',
          villains: [
            {
              id: '1',
              firstName: 'Tom',
            },
            {
              id: '3',
              firstName: 'Yehuda',
            },
          ],
          reformedVillains: [
            {
              id: '2',
              firstName: 'Alex',
            },
            {
              id: '4',
              firstName: 'Erik',
            },
          ],
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, HomePlanet, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'home-planet',
          attributes: {
            name: 'Earth',
          },
          relationships: {
            villains: {
              data: [
                { id: '1', type: 'super-villain' },
                { id: '3', type: 'super-villain' },
              ],
            },
            reformedVillains: {
              data: [
                { id: '2', type: 'super-villain' },
                { id: '4', type: 'super-villain' },
              ],
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
            },
            relationships: {},
          },
          {
            id: '3',
            type: 'super-villain',
            attributes: {
              firstName: 'Yehuda',
            },
            relationships: {},
          },
          {
            id: '2',
            type: 'super-villain',
            attributes: {
              firstName: 'Alex',
            },
            relationships: {},
          },
          {
            id: '4',
            type: 'super-villain',
            attributes: {
              firstName: 'Erik',
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'Extracting embedded works with multiple inverses of the same type'
      );
    });

    test('normalizeResponse with multiply-nested belongsTo', async function (assert) {
      let { owner } = this;
      owner.register(
        'serializer:evil-minion',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            superVillain: { embedded: 'always' },
          },
        })
      );
      owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            homePlanet: { embedded: 'always' },
          },
        })
      );

      const serializer = store.serializerFor('evil-minion');
      const EvilMinion = store.modelFor('evil-minion');
      const rawPayload = {
        evilMinion: {
          id: '1',
          name: 'Alex',
          superVillain: {
            id: '1',
            firstName: 'Tom',
            lastName: 'Dale',
            evilMinions: ['1'],
            homePlanet: {
              id: '1',
              name: 'Umber',
              villains: ['1'],
            },
          },
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, EvilMinion, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'evil-minion',
          attributes: {
            name: 'Alex',
          },
          relationships: {
            superVillain: {
              data: { id: '1', type: 'super-villain' },
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
              lastName: 'Dale',
            },
            relationships: {
              evilMinions: {
                data: [{ id: '1', type: 'evil-minion' }],
              },
              homePlanet: {
                data: { id: '1', type: 'home-planet' },
              },
            },
          },
          {
            id: '1',
            type: 'home-planet',
            attributes: {
              name: 'Umber',
            },
            relationships: {
              villains: {
                data: [{ id: '1', type: 'super-villain' }],
              },
            },
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'we normalized to json-api and extracted the multiply nested belongTos'
      );
    });

    test('normalizeResponse with polymorphic hasMany and custom primary key', async function (assert) {
      let { owner } = this;
      class SuperVillainClass extends Model {
        @attr('string') firstName;
        @attr('string') lastName;
        @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
        @belongsTo('secret-lab', { async: false, inverse: 'superVillain' }) secretLab;
        @hasMany('secretWeapon', { polymorphic: true, async: false, inverse: 'superVillain' }) secretWeapons;
        @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
      }

      owner.register(
        'serializer:light-saber',
        RESTSerializer.extend({
          primaryKey: 'custom',
        })
      );
      owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            secretWeapons: { embedded: 'always' },
          },
        })
      );
      owner.unregister('model:super-villain');
      owner.register('model:super-villain', SuperVillainClass);

      const serializer = store.serializerFor('super-villain');
      const SuperVillain = store.modelFor('super-villain');
      const rawPayload = {
        super_villain: {
          id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          secretWeapons: [
            {
              custom: '1',
              type: 'LightSaber',
              name: "Tom's LightSaber",
              color: 'Red',
            },
            {
              id: '1',
              type: 'SecretWeapon',
              name: 'The Death Star',
            },
          ],
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, SuperVillain, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
          id: '1',
          relationships: {
            secretWeapons: {
              data: [
                { type: 'light-saber', id: '1' },
                { type: 'secret-weapon', id: '1' },
              ],
            },
          },
          type: 'super-villain',
        },
        included: [
          {
            attributes: {
              color: 'Red',
              name: "Tom's LightSaber",
            },
            id: '1',
            relationships: {},
            type: 'light-saber',
          },
          {
            attributes: {
              name: 'The Death Star',
            },
            id: '1',
            relationships: {},
            type: 'secret-weapon',
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'we normalized to json-api and extracted the polymorphic hasMany with a custom key'
      );
    });

    test('normalizeResponse with polymorphic belongsTo', async function (assert) {
      let { owner } = this;
      class SuperVillainClass extends Model {
        @attr('string') firstName;
        @attr('string') lastName;
        @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
        @belongsTo('secretLab', { polymorphic: true, async: true, inverse: 'superVillain' }) secretLab;
        @hasMany('secret-weapon', { async: false, inverse: 'superVillain' }) secretWeapons;
        @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
      }

      owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            secretLab: { embedded: 'always' },
          },
        })
      );
      owner.unregister('model:super-villain');
      owner.register('model:super-villain', SuperVillainClass);

      const serializer = store.serializerFor('super-villain');
      const SuperVillain = store.modelFor('super-villain');
      const rawPayload = {
        super_villain: {
          id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          secretLab: {
            id: '1',
            type: 'bat-cave',
            infiltrated: true,
          },
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, SuperVillain, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'super-villain',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
          relationships: {
            secretLab: {
              data: { id: '1', type: 'bat-cave' },
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'bat-cave',
            attributes: {
              infiltrated: true,
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'we normalize to json-api and extract the polymorphic belongsTo'
      );
    });

    test('normalizeResponse with polymorphic belongsTo and custom primary key', async function (assert) {
      let { owner } = this;
      class SuperVillainClass extends Model {
        @attr('string') firstName;
        @attr('string') lastName;
        @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
        @belongsTo('secretLab', { polymorphic: true, async: true, inverse: 'superVillain' }) secretLab;
        @hasMany('secret-weapon', { async: false, inverse: 'superVillain' }) secretWeapons;
        @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
      }

      owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            secretLab: { embedded: 'always' },
          },
        })
      );
      owner.register(
        'serializer:bat-cave',
        RESTSerializer.extend({
          primaryKey: 'custom',
        })
      );
      owner.unregister('model:super-villain');
      owner.register('model:super-villain', SuperVillainClass);

      const serializer = store.serializerFor('super-villain');
      const SuperVillain = store.modelFor('super-villain');
      const rawPayload = {
        superVillain: {
          id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          secretLab: {
            custom: '1',
            type: 'bat-cave',
            infiltrated: true,
          },
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, SuperVillain, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
          id: '1',
          relationships: {
            secretLab: {
              data: {
                id: '1',
                type: 'bat-cave',
              },
            },
          },
          type: 'super-villain',
        },
        included: [
          {
            attributes: {
              infiltrated: true,
            },
            id: '1',
            relationships: {},
            type: 'bat-cave',
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'we normalize to json-api and extract the polymorphic belongsTo with a custom key'
      );
    });

    test('normalize with custom belongsTo primary key', async function (assert) {
      let { owner } = this;
      owner.register(
        'serializer:evil-minion',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            superVillain: { embedded: 'always' },
          },
        })
      );
      owner.register(
        'serializer:super-villain',
        RESTSerializer.extend({
          primaryKey: 'custom',
        })
      );

      const serializer = store.serializerFor('evil-minion');
      const EvilMinion = store.modelFor('evil-minion');
      const rawPayload = {
        evilMinion: {
          id: '1',
          name: 'Alex',
          superVillain: {
            custom: '1',
            firstName: 'Tom',
            lastName: 'Dale',
          },
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, EvilMinion, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'evil-minion',
          attributes: {
            name: 'Alex',
          },
          relationships: {
            superVillain: {
              data: { id: '1', type: 'super-villain' },
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
              lastName: 'Dale',
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(normalizedJsonApi, expectedOutput, 'we normalize to json-api with custom belongsTo primary key');
    });
  });

  module('Normalize using findAll', function () {
    test('normalizeResponse with embedded objects', async function (assert) {
      this.owner.register(
        'serializer:home-planet',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            villains: { embedded: 'always' },
          },
        })
      );

      const serializer = store.serializerFor('home-planet');
      const HomePlanet = store.modelFor('home-planet');
      const rawPayload = {
        homePlanets: [
          {
            id: '1',
            name: 'Umber',
            villains: [
              {
                id: '1',
                firstName: 'Tom',
                lastName: 'Dale',
              },
            ],
          },
        ],
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, HomePlanet, rawPayload, null, 'findAll');
      const expectedOutput = {
        data: [
          {
            id: '1',
            type: 'home-planet',
            attributes: {
              name: 'Umber',
            },
            relationships: {
              villains: {
                data: [{ id: '1', type: 'super-villain' }],
              },
            },
          },
        ],
        included: [
          {
            id: '1',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
              lastName: 'Dale',
            },
            relationships: {},
          },
        ],
      };
      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'extracts embedded records for all resources in the primary payload'
      );
    });

    test('normalizeResponse with embedded objects with custom primary key', async function (assert) {
      let { owner } = this;
      owner.register(
        'serializer:super-villain',
        RESTSerializer.extend({
          primaryKey: 'villain_id',
        })
      );
      owner.register(
        'serializer:home-planet',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            villains: { embedded: 'always' },
          },
        })
      );
      const serializer = store.serializerFor('home-planet');
      const HomePlanet = store.modelFor('home-planet');
      const rawPayload = {
        homePlanets: [
          {
            id: '1',
            name: 'Umber',
            villains: [
              {
                villain_id: '2',
                firstName: 'Alex',
                lastName: 'Baizeau',
              },
            ],
          },
        ],
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, HomePlanet, rawPayload, null, 'findAll');
      const expectedOutput = {
        data: [
          {
            id: '1',
            type: 'home-planet',
            attributes: {
              name: 'Umber',
            },
            relationships: {
              villains: {
                data: [{ id: '2', type: 'super-villain' }],
              },
            },
          },
        ],
        included: [
          {
            id: '2',
            type: 'super-villain',
            attributes: {
              firstName: 'Alex',
              lastName: 'Baizeau',
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(normalizedJsonApi, expectedOutput, 'works with custom primaryKey');
    });

    // TODO this is a super weird test, probably not a valid scenario to have any guarantees around
    test('normalizeResponse with embedded objects with identical relationship and attribute key ', async function (assert) {
      this.owner.register(
        'serializer:home-planet',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            villains: { embedded: 'always' },
          },
          //Makes the keyForRelationship and keyForAttribute collide.
          keyForRelationship(key, type) {
            if (key === 'villains') {
              return 'ourVillains';
            }
            return this._super(key, type);
          },
          keyForAttribute(key, type) {
            if (key === 'name') {
              return 'ourVillains';
            }
            return this._super(key, type);
          },
        })
      );

      const serializer = store.serializerFor('home-planet');
      const HomePlanet = store.modelFor('home-planet');
      const rawPayload = {
        homePlanets: [
          {
            id: '1',
            name: 'Umber',
            ourVillains: [
              {
                id: '1',
                firstName: 'Alex',
                lastName: 'Baizeau',
              },
            ],
          },
        ],
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, HomePlanet, rawPayload, null, 'findAll');
      const expectedOutput = {
        data: [
          {
            id: '1',
            type: 'home-planet',
            attributes: {
              // nothing maps to the original "name" key
              // instead we find the "ourVillains" object for attributes as well
              // bc "name" is defined using the "string" transform, we cast it to
              // a "string"
              name: `${[
                {
                  id: '1',
                  firstName: 'Alex',
                  lastName: 'Baizeau',
                },
              ]}`,
            },
            // we find this key for the relationship too
            relationships: {
              villains: {
                data: [{ id: '1', type: 'super-villain' }],
              },
            },
          },
        ],
        included: [
          {
            id: '1',
            type: 'super-villain',
            attributes: {
              firstName: 'Alex',
              lastName: 'Baizeau',
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(normalizedJsonApi, expectedOutput, 'when the key for a relationship and an attribute collide, ');
    });

    test('normalizeResponse with embedded objects of same type as primary type', async function (assert) {
      this.owner.register(
        'serializer:comment',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            children: { embedded: 'always' },
          },
        })
      );
      const serializer = store.serializerFor('comment');
      const Comment = store.modelFor('comment');
      const rawPayload = {
        comments: [
          {
            id: '1',
            body: 'Hello',
            root: true,
            children: [
              {
                id: '2',
                body: 'World',
                root: false,
              },
              {
                id: '3',
                body: 'Foo',
                root: false,
              },
            ],
          },
        ],
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, Comment, rawPayload, null, 'findAll');
      const expectedOutput = {
        data: [
          {
            id: '1',
            type: 'comment',
            attributes: {
              body: 'Hello',
              root: true,
            },
            relationships: {
              children: {
                data: [
                  { id: '2', type: 'comment' },
                  { id: '3', type: 'comment' },
                ],
              },
            },
          },
        ],
        included: [
          {
            id: '2',
            type: 'comment',
            attributes: {
              body: 'World',
              root: false,
            },
            relationships: {},
          },
          {
            id: '3',
            type: 'comment',
            attributes: {
              body: 'Foo',
              root: false,
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'We normalized to json-api and data only includes the primary resources'
      );
    });

    test('normalizeResponse with embedded objects of same type, but from separate attributes', async function (assert) {
      let { owner } = this;
      class HomePlanetClass extends Model {
        @attr('string') name;
        @hasMany('super-villain', { inverse: 'homePlanet', async: false }) villains;
        @hasMany('superVillain', { async: false, inverse: null }) reformedVillains;
      }
      owner.unregister('model:home-planet');
      owner.register('model:home-planet', HomePlanetClass);
      owner.register(
        'serializer:home-planet',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            villains: { embedded: 'always' },
            reformedVillains: { embedded: 'always' },
          },
        })
      );
      const serializer = store.serializerFor('home-planet');
      const HomePlanet = store.modelFor('home-planet');
      const rawPayload = {
        homePlanets: [
          {
            id: '1',
            name: 'Earth',
            villains: [
              {
                id: '1',
                firstName: 'Tom',
              },
              {
                id: '3',
                firstName: 'Yehuda',
              },
            ],
            reformedVillains: [
              {
                id: '2',
                firstName: 'Alex',
              },
              {
                id: '4',
                firstName: 'Erik',
              },
            ],
          },
          {
            id: '2',
            name: 'Mars',
            villains: [
              {
                id: '1',
                firstName: 'Tom',
              },
              {
                id: '3',
                firstName: 'Yehuda',
              },
            ],
            reformedVillains: [
              {
                id: '5',
                firstName: 'Peter',
              },
              {
                id: '6',
                firstName: 'Trek',
              },
            ],
          },
        ],
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, HomePlanet, rawPayload, null, 'findAll');
      const expectedOutput = {
        data: [
          {
            id: '1',
            type: 'home-planet',
            attributes: {
              name: 'Earth',
            },
            relationships: {
              reformedVillains: {
                data: [
                  { id: '2', type: 'super-villain' },
                  { id: '4', type: 'super-villain' },
                ],
              },
              villains: {
                data: [
                  { id: '1', type: 'super-villain' },
                  { id: '3', type: 'super-villain' },
                ],
              },
            },
          },
          {
            id: '2',
            type: 'home-planet',
            attributes: {
              name: 'Mars',
            },
            relationships: {
              reformedVillains: {
                data: [
                  { id: '5', type: 'super-villain' },
                  { id: '6', type: 'super-villain' },
                ],
              },
              villains: {
                data: [
                  { id: '1', type: 'super-villain' },
                  { id: '3', type: 'super-villain' },
                ],
              },
            },
          },
        ],
        included: [
          {
            id: '1',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
            },
            relationships: {},
          },
          {
            id: '3',
            type: 'super-villain',
            attributes: {
              firstName: 'Yehuda',
            },
            relationships: {},
          },
          {
            id: '2',
            type: 'super-villain',
            attributes: {
              firstName: 'Alex',
            },
            relationships: {},
          },
          {
            id: '4',
            type: 'super-villain',
            attributes: {
              firstName: 'Erik',
            },
            relationships: {},
          },
          {
            id: '1',
            type: 'super-villain',
            attributes: {
              firstName: 'Tom',
            },
            relationships: {},
          },
          {
            id: '3',
            type: 'super-villain',
            attributes: {
              firstName: 'Yehuda',
            },
            relationships: {},
          },
          {
            id: '5',
            type: 'super-villain',
            attributes: {
              firstName: 'Peter',
            },
            relationships: {},
          },
          {
            id: '6',
            type: 'super-villain',
            attributes: {
              firstName: 'Trek',
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'We normalized to json-api and only the primary resources are in data, embedded of the same type is in included'
      );
    });

    test('normalizeResponse with embedded object (belongsTo relationship)', async function (assert) {
      this.owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            secretLab: { embedded: 'always' },
          },
        })
      );

      const serializer = store.serializerFor('super-villain');
      const SuperVillain = store.modelFor('super-villain');
      const rawPayload = {
        super_villain: {
          id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          evilMinions: ['1', '2', '3'],
          secretLab: {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          },
          secretWeapons: [],
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, SuperVillain, rawPayload, '1', 'findRecord');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'super-villain',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
          relationships: {
            evilMinions: {
              data: [
                { id: '1', type: 'evil-minion' },
                { id: '2', type: 'evil-minion' },
                { id: '3', type: 'evil-minion' },
              ],
            },
            homePlanet: {
              data: { id: '123', type: 'home-planet' },
            },
            secretLab: {
              data: { id: '101', type: 'secret-lab' },
            },
            secretWeapons: {
              data: [],
            },
          },
        },
        included: [
          {
            id: '101',
            type: 'secret-lab',
            attributes: {
              minionCapacity: 5000,
              vicinity: 'California, USA',
            },
            relationships: {},
          },
        ],
      };
      assert.deepEqual(
        normalizedJsonApi,
        expectedOutput,
        'we normalized to json-api and extracted the embedded belongsTo'
      );
    });

    test('normalizeResponse with polymorphic hasMany', async function (assert) {
      let { owner } = this;

      class SuperVillainClass extends Model {
        @attr('string') firstName;
        @attr('string') lastName;
        @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
        @belongsTo('secret-lab', { async: false, inverse: 'superVillain' }) secretLab;
        @hasMany('secretWeapon', { polymorphic: true, async: false, inverse: 'superVillain' }) secretWeapons;
        @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
      }

      owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            secretWeapons: { embedded: 'always' },
          },
        })
      );
      owner.unregister('model:super-villain');
      owner.register('model:super-villain', SuperVillainClass);

      const serializer = store.serializerFor('super-villain');
      const SuperVillain = store.modelFor('super-villain');
      const rawPayload = {
        super_villain: {
          id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          secretWeapons: [
            {
              id: '1',
              type: 'LightSaber',
              name: "Tom's LightSaber",
              color: 'Red',
            },
            {
              id: '1',
              type: 'SecretWeapon',
              name: 'The Death Star',
            },
          ],
        },
      };
      const normalizedJsonApi = serializer.normalizeResponse(store, SuperVillain, rawPayload, '1', 'findAll');
      const expectedOutput = {
        data: {
          id: '1',
          type: 'super-villain',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
          relationships: {
            secretWeapons: {
              data: [
                { id: '1', type: 'light-saber' },
                { id: '1', type: 'secret-weapon' },
              ],
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'light-saber',
            attributes: {
              color: 'Red',
              name: "Tom's LightSaber",
            },
            relationships: {},
          },
          {
            id: '1',
            type: 'secret-weapon',
            attributes: {
              name: 'The Death Star',
            },
            relationships: {},
          },
        ],
      };

      assert.deepEqual(normalizedJsonApi, expectedOutput, 'We normalize to json-api with a polymorphic hasMany');
    });
  });

  module('Serialize', function () {
    test('serialize supports serialize:false on non-relationship properties', async function (assert) {
      this.owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            firstName: { serialize: false },
          },
        })
      );

      const serializer = store.serializerFor('super-villain');
      const tom = store.createRecord('super-villain', {
        firstName: 'Tom',
        lastName: 'Dale',
        id: '1',
      });
      const serializedRestJson = serializer.serialize(tom._createSnapshot());
      const expectedOutput = {
        lastName: 'Dale',
        homePlanet: null,
        secretLab: null,
      };

      assert.deepEqual(serializedRestJson, expectedOutput, 'We do not serialize attrs defined with serialize:false');
    });

    test('Mixin can be used with RESTSerializer which does not define keyForAttribute', async function (assert) {
      this.owner.register(
        'serializer:super-villain',
        RESTSerializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            evilMinions: { serialize: 'records', deserialize: 'records' },
          },
        })
      );

      let homePlanet = store.createRecord('home-planet', { name: 'Villain League', id: '123' });
      let secretLab = store.createRecord('secret-lab', {
        minionCapacity: 5000,
        vicinity: 'California, USA',
        id: '101',
      });
      let superVillain = store.createRecord('super-villain', {
        id: '1',
        firstName: 'Super',
        lastName: 'Villian',
        homePlanet,
        secretLab,
      });
      let secretWeapon = store.createRecord('secret-weapon', {
        id: '1',
        name: 'Secret Weapon',
        superVillain,
      });

      superVillain.secretWeapons.push(secretWeapon);

      let evilMinion = store.createRecord('evil-minion', {
        id: '1',
        name: 'Evil Minion',
        superVillain,
      });
      superVillain.evilMinions.push(evilMinion);

      const serializer = store.serializerFor('super-villain');
      const serializedRestJson = serializer.serialize(superVillain._createSnapshot());
      const expectedOutput = {
        firstName: 'Super',
        lastName: 'Villian',
        homePlanet: '123',
        evilMinions: [
          {
            id: '1',
            name: 'Evil Minion',
            superVillain: '1',
          },
        ],
        secretLab: '101',
        // "manyToOne" relation does not serialize by default
        // secretWeapons: ["1"]
      };

      assert.deepEqual(serializedRestJson, expectedOutput, 'we serialize correctly');
    });

    test('serializing relationships with an embedded and without calls super when not attr not present', async function (assert) {
      let { owner } = this;
      let calledSerializeBelongsTo = false;
      let calledSerializeHasMany = false;

      const Serializer = RESTSerializer.extend({
        serializeBelongsTo(snapshot, json, relationship) {
          calledSerializeBelongsTo = true;
          return this._super(snapshot, json, relationship);
        },

        serializeHasMany(snapshot, json, relationship) {
          calledSerializeHasMany = true;
          let key = relationship.key;
          let payloadKey = this.keyForRelationship ? this.keyForRelationship(key, 'hasMany') : key;
          let schema = this.store.modelFor(snapshot.modelName);
          let relationshipType = schema.determineRelationshipType(relationship, store);
          // "manyToOne" not supported in ActiveModelSerializer.prototype.serializeHasMany
          let relationshipTypes = ['manyToNone', 'manyToMany', 'manyToOne'];
          if (relationshipTypes.indexOf(relationshipType) > -1) {
            json[payloadKey] = snapshot.hasMany(key, { ids: true });
          }
        },
      });

      owner.register('serializer:evil-minion', Serializer);
      owner.register('serializer:secret-weapon', Serializer);
      owner.register(
        'serializer:super-villain',
        Serializer.extend(EmbeddedRecordsMixin, {
          attrs: {
            evilMinions: { serialize: 'records', deserialize: 'records' },
            // some relationships are not listed here, so super should be called on those
            // e.g. secretWeapons: { serialize: 'ids' }
          },
        })
      );

      let homePlanet = store.createRecord('home-planet', {
        name: 'Villain League',
        id: '123',
      });
      let secretLab = store.createRecord('secret-lab', {
        minionCapacity: 5000,
        vicinity: 'California, USA',
        id: '101',
      });
      let superVillain = store.createRecord('super-villain', {
        id: '1',
        firstName: 'Super',
        lastName: 'Villian',
        homePlanet,
        secretLab,
      });
      let secretWeapon = store.createRecord('secret-weapon', {
        id: '1',
        name: 'Secret Weapon',
        superVillain,
      });

      superVillain.secretWeapons.push(secretWeapon);
      let evilMinion = store.createRecord('evil-minion', {
        id: '1',
        name: 'Evil Minion',
        superVillain,
      });
      superVillain.evilMinions.push(evilMinion);

      const serializer = store.serializerFor('super-villain');
      const serializedRestJson = serializer.serialize(superVillain._createSnapshot());
      const expectedOutput = {
        firstName: 'Super',
        lastName: 'Villian',
        homePlanet: '123',
        evilMinions: [
          {
            id: '1',
            name: 'Evil Minion',
            superVillain: '1',
          },
        ],
        secretLab: '101',
        // customized serializeHasMany method to generate ids for "manyToOne" relation
        secretWeapons: ['1'],
      };

      assert.deepEqual(serializedRestJson, expectedOutput, 'we serialized correctly');
      assert.ok(calledSerializeBelongsTo);
      assert.ok(calledSerializeHasMany);
    });

    module('Serialize hasMany', function () {
      test('serialize with embedded objects (hasMany relationship)', async function (assert) {
        this.owner.register(
          'serializer:home-planet',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              villains: { embedded: 'always' },
            },
          })
        );

        let homePlanet = store.createRecord('home-planet', {
          name: 'Villain League',
          id: '123',
        });
        store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet,
          id: '1',
        });
        const serializer = store.serializerFor('home-planet');
        const serializedRestJson = serializer.serialize(homePlanet._createSnapshot());
        const expectedOutput = {
          name: 'Villain League',
          villains: [
            {
              id: '1',
              firstName: 'Tom',
              lastName: 'Dale',
              homePlanet: '123',
              secretLab: null,
            },
          ],
        };

        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We serialized the hasMany relationship into an embedded object'
        );
      });

      test('serialize with embedded objects and a custom keyForAttribute (hasMany relationship)', async function (assert) {
        this.owner.register(
          'serializer:home-planet',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            keyForRelationship(key) {
              return key + '-custom';
            },
            attrs: {
              villains: { embedded: 'always' },
            },
          })
        );
        let homePlanet = store.createRecord('home-planet', {
          name: 'Villain League',
          id: '123',
        });
        store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet,
          id: '1',
        });

        const serializer = store.serializerFor('home-planet');
        const serializedRestJson = serializer.serialize(homePlanet._createSnapshot());
        const expectedOutput = {
          name: 'Villain League',
          'villains-custom': [
            {
              id: '1',
              firstName: 'Tom',
              lastName: 'Dale',
              homePlanet: '123',
              secretLab: null,
            },
          ],
        };

        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We serialized the hasMany into an embedded format with a custom key'
        );
      });

      testInDebug('serialize with embedded objects (unknown hasMany relationship)', async function (assert) {
        this.owner.register(
          'serializer:home-planet',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              villains: { embedded: 'always' },
            },
          })
        );

        store.push({
          data: {
            type: 'home-planet',
            id: '123',
            attributes: {
              name: 'Villain League',
            },
          },
        });
        const serializer = store.serializerFor('home-planet');
        let league = store.peekRecord('home-planet', 123);
        let serializedRestJson;
        const expectedOutput = {
          name: 'Villain League',
          villains: [],
        };

        assert.expectWarning(function () {
          serializedRestJson = serializer.serialize(league._createSnapshot());
        }, /The embedded relationship 'villains' is undefined for 'home-planet' with id '123'. Please include it in your original payload./);

        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialize the missing hasMany to an empty array');
      });

      test('serialize with embedded objects (hasMany relationship) supports serialize:false', async function (assert) {
        this.owner.register(
          'serializer:home-planet',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              villains: { serialize: false },
            },
          })
        );

        let homePlanet = store.createRecord('home-planet', {
          name: 'Villain League',
          id: '123',
        });
        store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet,
          id: '1',
        });

        const serializer = store.serializerFor('home-planet');
        const serializedRestJson = serializer.serialize(homePlanet._createSnapshot());
        const expectedOutput = {
          name: 'Villain League',
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'We do not serialize the hasMany');
      });

      test('serialize with (new) embedded objects (hasMany relationship)', async function (assert) {
        this.owner.register(
          'serializer:home-planet',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              villains: { embedded: 'always' },
            },
          })
        );

        let homePlanet = store.createRecord('home-planet', {
          name: 'Villain League',
          id: '123',
        });
        store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet,
        });
        const serializer = store.serializerFor('home-planet');
        const serializedRestJson = serializer.serialize(homePlanet._createSnapshot());
        const expectedOutput = {
          name: 'Villain League',
          villains: [
            {
              firstName: 'Tom',
              lastName: 'Dale',
              homePlanet: '123',
              secretLab: null,
            },
          ],
        };
        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We embed new members of a hasMany when serializing even if they do not have IDs'
        );
      });

      test('serialize with embedded objects (hasMany relationships, including related objects not embedded)', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              evilMinions: { serialize: 'records', deserialize: 'records' },
              secretWeapons: { serialize: 'ids' },
            },
          })
        );

        let superVillain = store.createRecord('super-villain', {
          id: '1',
          firstName: 'Super',
          lastName: 'Villian',
        });
        let evilMinion = store.createRecord('evil-minion', {
          id: '1',
          name: 'Evil Minion',
          superVillain,
        });
        let secretWeapon = store.createRecord('secret-weapon', {
          id: '1',
          name: 'Secret Weapon',
          superVillain,
        });

        superVillain.evilMinions.push(evilMinion);
        superVillain.secretWeapons.push(secretWeapon);

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(superVillain._createSnapshot());
        const expectedOutput = {
          firstName: 'Super',
          lastName: 'Villian',
          homePlanet: null,
          evilMinions: [
            {
              id: '1',
              name: 'Evil Minion',
              superVillain: '1',
            },
          ],
          secretLab: null,
          secretWeapons: ['1'],
        };
        assert.deepEqual(serializedRestJson, expectedOutput, 'We only embed relationships we are told to embed');
      });

      test('serialize has many relationship using the `ids-and-types` strategy', async function (assert) {
        let { owner } = this;
        class NormalMinion extends Model {
          @attr('string') name;
        }
        const YellowMinion = NormalMinion.extend();
        const RedMinion = NormalMinion.extend();
        class CommanderVillain extends Model {
          @attr('string') name;
          @hasMany('normal-minion', { async: true, inverse: null, polymorphic: true }) minions;
        }

        owner.register('model:commander-villain', CommanderVillain);
        owner.register('model:normal-minion', NormalMinion);
        owner.register('model:yellow-minion', YellowMinion);
        owner.register('model:red-minion', RedMinion);
        owner.register(
          'serializer:commander-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              minions: { serialize: 'ids-and-types' },
            },
          })
        );

        let yellowMinion = store.createRecord('yellow-minion', {
          id: '1',
          name: 'Yellowy',
        });
        let redMinion = store.createRecord('red-minion', {
          id: '1',
          name: 'Reddy',
        });
        let commanderVillain = store.createRecord('commander-villain', {
          id: '1',
          name: 'Jeff',
          minions: [yellowMinion, redMinion],
        });

        const serializer = store.serializerFor('commander-villain');
        const serializedRestJson = serializer.serialize(commanderVillain._createSnapshot());
        const expectedOutput = {
          name: 'Jeff',
          minions: [
            {
              id: '1',
              type: 'yellow-minion',
            },
            {
              id: '1',
              type: 'red-minion',
            },
          ],
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialized both ids and types for the hasMany');
      });

      test('serializing embedded hasMany respects remapped attrs key', async function (assert) {
        let { owner } = this;
        owner.register(
          'serializer:home-planet',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              villains: { embedded: 'always', key: 'notable_persons' },
            },
          })
        );
        owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              homePlanet: { serialize: false },
              secretLab: { serialize: false },
            },
          })
        );

        let homePlanet = store.createRecord('home-planet', { name: 'Hoth' });
        store.createRecord('super-villain', {
          firstName: 'Ice',
          lastName: 'Creature',
          homePlanet: homePlanet,
        });

        const serializer = store.serializerFor('home-planet');
        const serializedRestJson = serializer.serialize(homePlanet._createSnapshot());
        const expectedOutput = {
          name: 'Hoth',
          notable_persons: [
            {
              firstName: 'Ice',
              lastName: 'Creature',
            },
          ],
        };
        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'we normalized to json-api and remapped the hasMany relationship'
        );
      });

      test('serializing ids hasMany respects remapped attrs key', async function (assert) {
        let { owner } = this;
        owner.register(
          'serializer:home-planet',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              villains: { serialize: 'ids', key: 'notable_persons' },
            },
          })
        );
        owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              homePlanet: { serialize: false },
              secretLab: { serialize: false },
            },
          })
        );

        let homePlanet = store.createRecord('home-planet', { name: 'Hoth' });
        let superVillain = store.createRecord('super-villain', {
          firstName: 'Ice',
          lastName: 'Creature',
          homePlanet,
        });

        const serializer = store.serializerFor('home-planet');
        const serializedRestJson = serializer.serialize(homePlanet._createSnapshot());
        const expectedOutput = {
          name: 'Hoth',
          notable_persons: [superVillain.id],
        };
        assert.deepEqual(serializedRestJson, expectedOutput, 'we serialized respecting the custom key in attrs');
      });
    });

    module('Serialize belongsTo', function () {
      test('serialize with embedded object (belongsTo relationship)', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { embedded: 'always' },
            },
          })
        );

        // records with an id, persisted
        let secretLab = store.createRecord('secret-lab', {
          minionCapacity: 5000,
          vicinity: 'California, USA',
          id: '101',
        });
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab,
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });
        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: {
            id: '101',
            minionCapacity: 5000,
            vicinity: 'California, USA',
          },
        };
        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We embed belongsTo relationships when serializing if specified'
        );
      });

      test('serialize with embedded object (polymorphic belongsTo relationship)', async function (assert) {
        let { owner } = this;
        owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { embedded: 'always' },
            },
          })
        );
        class SuperVillain extends Model {
          @attr('string') firstName;
          @attr('string') lastName;
          @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
          @belongsTo('secret-lab', { async: true, inverse: 'superVillain', polymorphic: true }) secretLab;
          @hasMany('secret-weapon', { async: false, inverse: 'superVillain' }) secretWeapons;
          @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
        }
        owner.unregister('model:super-villain');
        owner.register('model:super-villain', SuperVillain);

        let tom = store.createRecord('super-villain', {
          id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          secretLab: store.createRecord('bat-cave', {
            id: '101',
            minionCapacity: 5000,
            vicinity: 'California, USA',
            infiltrated: true,
          }),
          homePlanet: store.createRecord('home-planet', {
            id: '123',
            name: 'Villain League',
          }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLabType: 'batCave',
          secretLab: {
            id: '101',
            minionCapacity: 5000,
            vicinity: 'California, USA',
            infiltrated: true,
          },
        };

        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'we serialized an embedded polymorphic relationship correctly'
        );
      });

      test('serialize with embedded object (belongsTo relationship) works with different primaryKeys', async function (assert) {
        let { owner } = this;
        owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            primaryKey: '_id',
            attrs: {
              secretLab: { embedded: 'always' },
            },
          })
        );
        owner.register(
          'serializer:secret-lab',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            primaryKey: 'crazy_id',
          })
        );

        const superVillainSerializer = store.serializerFor('super-villain');

        // records with an id, persisted
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('secret-lab', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializedRestJson = superVillainSerializer.serialize(tom._createSnapshot(), {
          includeId: true,
        });
        const expectedOutput = {
          _id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: {
            crazy_id: '101',
            minionCapacity: 5000,
            vicinity: 'California, USA',
          },
        };
        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We serialize the embedded belongsTo with the correct primaryKey field'
        );
      });

      test('serialize with embedded object (belongsTo relationship, new no id)', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { embedded: 'always' },
            },
          })
        );

        const serializer = store.serializerFor('super-villain');

        // records without ids, new
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          secretLab: store.createRecord('secret-lab', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: {
            minionCapacity: 5000,
            vicinity: 'California, USA',
          },
        };

        assert.deepEqual(serializedRestJson, expectedOutput);
      });

      test('serialize with embedded object (polymorphic belongsTo relationship) supports serialize:ids', async function (assert) {
        let { owner } = this;
        class SuperVillain extends Model {
          @attr('string') firstName;
          @attr('string') lastName;
          @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
          @belongsTo('secret-lab', { polymorphic: true, async: true, inverse: 'superVillain' }) secretLab;
          @hasMany('secret-weapon', { async: false, inverse: 'superVillain' }) secretWeapons;
          @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
        }
        owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { serialize: 'ids' },
            },
          })
        );
        owner.unregister('model:super-villain');
        owner.register('model:super-villain', SuperVillain);

        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('bat-cave', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: '101',
          secretLabType: 'batCave',
        };
        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialize the polymorphic type');
      });

      test('serialize with embedded object (belongsTo relationship) supports serialize:id', async function (assert) {
        let { owner } = this;
        class SuperVillain extends Model {
          @attr('string') firstName;
          @attr('string') lastName;
          @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
          @belongsTo('secret-lab', { polymorphic: true, inverse: 'superVillain', async: true }) secretLab;
          @hasMany('secret-weapon', { async: false, inverse: 'superVillain' }) secretWeapons;
          @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
        }

        owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { serialize: 'id' },
            },
          })
        );
        owner.unregister('model:super-villain');
        owner.register('model:super-villain', SuperVillain);

        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('bat-cave', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: '101',
          secretLabType: 'batCave',
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialize the id');
      });

      test('serialize with embedded object (belongsTo relationship) supports serialize:id in conjunction with deserialize:records', async function (assert) {
        let { owner } = this;
        class SuperVillain extends Model {
          @attr('string') firstName;
          @attr('string') lastName;
          @belongsTo('home-planet', { inverse: 'villains', async: true }) homePlanet;
          @belongsTo('secret-lab', { polymorphic: true, inverse: 'superVillain', async: true }) secretLab;
          @hasMany('secret-weapon', { async: false, inverse: 'superVillain' }) secretWeapons;
          @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
        }

        owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { serialize: 'id', deserialize: 'records' },
            },
          })
        );
        owner.unregister('model:super-villain');
        owner.register('model:super-villain', SuperVillain);

        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('bat-cave', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: '101',
          secretLabType: 'batCave',
        };

        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We support serialize:ids when deserialize:records is present'
        );
      });

      test('serialize with embedded object (belongsTo relationship) supports serialize:ids', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { serialize: 'ids' },
            },
          })
        );

        // records with an id, persisted
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('secret-lab', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: '101',
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialized the belongsTo relationships to IDs');
      });

      test('serialize with embedded object (belongsTo relationship) supports serialize:id', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { serialize: 'id' },
            },
          })
        );

        // records with an id, persisted
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('secret-lab', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: '101',
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialized the belongsTo relationships to IDs');
      });

      test('serialize with embedded object (belongsTo relationship) supports serialize:id in conjunction with deserialize:records', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { serialize: 'id', deserialize: 'records' },
            },
          })
        );

        // records with an id, persisted
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('secret-lab', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: '101',
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialized the belongsTo relationships to IDs');
      });

      test('serialize with embedded object (belongsTo relationship) supports serialize:false', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { serialize: false },
            },
          })
        );

        // records with an id, persisted
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('secret-lab', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
        };

        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We do not serialize relationships that specify serialize:false'
        );
      });

      test('serialize with embedded object (belongsTo relationship) serializes the id by default if no option specified', async function (assert) {
        this.owner.register('serializer:super-villain', RESTSerializer.extend(EmbeddedRecordsMixin));

        // records with an id, persisted
        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          secretLab: store.createRecord('secret-lab', {
            minionCapacity: 5000,
            vicinity: 'California, USA',
            id: '101',
          }),
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: '101',
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'We serialized the belongsTo relationships to IDs');
      });

      test('when related record is not present, serialize embedded record (with a belongsTo relationship) as null', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretLab: { embedded: 'always' },
            },
          })
        );

        let tom = store.createRecord('super-villain', {
          firstName: 'Tom',
          lastName: 'Dale',
          id: '1',
          homePlanet: store.createRecord('home-planet', { name: 'Villain League', id: '123' }),
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(tom._createSnapshot());
        const expectedOutput = {
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '123',
          secretLab: null,
        };

        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We serialized missing belongsTo relationships to null when always embedded'
        );
      });

      test('serializing belongsTo correctly removes embedded foreign key', async function (assert) {
        let { owner } = this;
        class SecretWeaponClass extends Model {
          @attr('string') name;
        }
        class EvilMinionClass extends Model {
          @belongsTo('secret-weapon', { async: false, inverse: null }) secretWeapon;
          @attr('string') name;
        }

        owner.register(
          'serializer:evil-minion',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              secretWeapon: { embedded: 'always' },
            },
          })
        );
        owner.unregister('model:secret-weapon');
        owner.unregister('model:evil-minion');
        owner.register('model:secret-weapon', SecretWeaponClass);
        owner.register('model:evil-minion', EvilMinionClass);

        let secretWeapon = store.createRecord('secret-weapon', { name: 'Secret Weapon' });
        let evilMinion = store.createRecord('evil-minion', {
          name: 'Evil Minion',
          secretWeapon,
        });

        const serializer = store.serializerFor('evil-minion');
        const serializedRestJson = serializer.serialize(evilMinion._createSnapshot());
        const expectedOutput = {
          name: 'Evil Minion',
          secretWeapon: {
            name: 'Secret Weapon',
          },
        };

        assert.deepEqual(
          serializedRestJson,
          expectedOutput,
          'We correctly remove the FK from the embedded inverse when serializing'
        );
      });

      test('serializing embedded belongsTo respects remapped attrs key', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              homePlanet: { embedded: 'always', key: 'favorite_place' },
            },
          })
        );

        let homePlanet = store.createRecord('home-planet', { name: 'Hoth' });
        let superVillain = store.createRecord('super-villain', {
          firstName: 'Ice',
          lastName: 'Creature',
          homePlanet,
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(superVillain._createSnapshot());
        const expectedOutput = {
          firstName: 'Ice',
          lastName: 'Creature',
          favorite_place: {
            name: 'Hoth',
          },
          secretLab: null,
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'we respect the remapped attrs key when serializing');
      });

      test('serializing id belongsTo respects remapped attrs key', async function (assert) {
        this.owner.register(
          'serializer:super-villain',
          RESTSerializer.extend(EmbeddedRecordsMixin, {
            attrs: {
              homePlanet: { serialize: 'id', key: 'favorite_place' },
            },
          })
        );

        let homePlanet = store.createRecord('home-planet', { name: 'Hoth' });
        let superVillain = store.createRecord('super-villain', {
          firstName: 'Ice',
          lastName: 'Creature',
          homePlanet,
        });

        const serializer = store.serializerFor('super-villain');
        const serializedRestJson = serializer.serialize(superVillain._createSnapshot());
        const expectedOutput = {
          firstName: 'Ice',
          lastName: 'Creature',
          favorite_place: homePlanet.id,
          secretLab: null,
        };

        assert.deepEqual(serializedRestJson, expectedOutput, 'we serialized with remapped keys');
      });
    });
  });
});
