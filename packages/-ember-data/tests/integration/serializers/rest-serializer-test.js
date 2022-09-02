import { bind, run } from '@ember/runloop';
import { camelize, dasherize, decamelize } from '@ember/string';

import { module, test } from 'qunit';

import Inflector, { singularize } from 'ember-inflector';
import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';
import RESTSerializer from '@ember-data/serializer/rest';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/serializer/rest - RESTSerializer', function (hooks) {
  setupTest(hooks);

  class HomePlanet extends Model {
    @attr('string') name;
    @hasMany('super-villain', { async: false, inverse: 'homePlanet' }) superVillains;
  }
  class SuperVillain extends Model {
    @attr('string') firstName;
    @attr('string') lastName;
    @belongsTo('home-planet', { async: false, inverse: 'superVillains' }) homePlanet;
    @hasMany('evil-minion', { async: false, inverse: 'superVillain' }) evilMinions;
  }
  class EvilMinion extends Model {
    @attr('string') name;
    @belongsTo('super-villain', { async: false, inverse: 'evilMinions' }) superVillain;
    @belongsTo('doomsday-device', { async: false, inverse: 'evilMinion', as: 'evil-minion' }) doomsdayDevice;
  }
  class YellowMinion extends EvilMinion {
    @attr('number') eyes;
  }
  class DoomsdayDevice extends Model {
    @attr('string') name;
    @belongsTo('evil-minion', { polymorphic: true, async: true, inverse: 'doomsdayDevice' }) evilMinion;
  }
  class Comment extends Model {
    @attr('string') body;
    @attr('boolean') root;
    @hasMany('comment', { inverse: null, async: false }) children;
  }
  class Basket extends Model {
    @attr('string') type;
    @attr('number') size;
  }
  class Container extends Model {
    @belongsTo('basket', { async: true, inverse: null }) type;
    @attr('string') volume;
  }

  hooks.beforeEach(function () {
    this.owner.register('model:super-villain', SuperVillain);
    this.owner.register('model:home-planet', HomePlanet);
    this.owner.register('model:evil-minion', EvilMinion);
    this.owner.register('model:yellow-minion', YellowMinion);
    this.owner.register('model:doomsday-device', DoomsdayDevice);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:basket', Basket);
    this.owner.register('model:container', Container);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());
  });

  test('modelNameFromPayloadKey returns always same modelName even for uncountable multi words keys', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    Inflector.inflector.uncountable('words');
    var expectedModelName = 'multi-words';

    assert.strictEqual(serializer.modelNameFromPayloadKey('multi_words'), expectedModelName);
    assert.strictEqual(serializer.modelNameFromPayloadKey('multi-words'), expectedModelName);
  });

  test('normalizeResponse should extract meta using extractMeta', function (assert) {
    this.owner.register(
      'serializer:home-planet',
      RESTSerializer.extend({
        extractMeta(store, modelClass, payload) {
          let meta = this._super(...arguments);
          meta.authors.push('Tomhuda');
          return meta;
        },
      })
    );

    var jsonHash = {
      meta: { authors: ['Tomster'] },
      home_planets: [{ id: '1', name: 'Umber', superVillains: [1] }],
    };

    let store = this.owner.lookup('service:store');

    var json = store
      .serializerFor('home-planet')
      .normalizeResponse(store, store.modelFor('home-planet'), jsonHash, null, 'findAll');

    assert.deepEqual(json.meta.authors, ['Tomster', 'Tomhuda']);
  });

  test('normalizeResponse with custom modelNameFromPayloadKey', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    serializer.modelNameFromPayloadKey = function (root) {
      var camelized = camelize(root);
      return singularize(camelized);
    };

    this.owner.register('serializer:home-planet', JSONSerializer.extend());
    this.owner.register('serializer:super-villain', JSONSerializer.extend());

    var jsonHash = {
      home_planets: [
        {
          id: '1',
          name: 'Umber',
          superVillains: [1],
        },
      ],
      super_villains: [
        {
          id: '1',
          firstName: 'Tom',
          lastName: 'Dale',
          homePlanet: '1',
        },
      ],
    };
    var array;

    run(function () {
      array = serializer.normalizeResponse(store, store.modelFor('home-planet'), jsonHash, '1', 'findRecord');
    });

    assert.deepEqual(array, {
      data: {
        id: '1',
        type: 'home-planet',
        attributes: {
          name: 'Umber',
        },
        relationships: {
          superVillains: {
            data: [{ id: '1', type: 'super-villain' }],
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
            homePlanet: {
              data: { id: '1', type: 'home-planet' },
            },
          },
        },
      ],
    });
  });

  testInDebug('normalizeResponse with type and custom modelNameFromPayloadKey', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    var homePlanetNormalizeCount = 0;

    serializer.modelNameFromPayloadKey = function (root) {
      return 'home-planet';
    };

    this.owner.register(
      'serializer:home-planet',
      RESTSerializer.extend({
        normalize() {
          homePlanetNormalizeCount++;
          return this._super.apply(this, arguments);
        },
      })
    );

    var jsonHash = {
      'my-custom-type': [{ id: '1', name: 'Umber', type: 'my-custom-type' }],
    };
    var array;

    run(function () {
      array = serializer.normalizeResponse(store, store.modelFor('home-planet'), jsonHash, '1', 'findAll');
    });

    assert.deepEqual(array, {
      data: [
        {
          id: '1',
          type: 'home-planet',
          attributes: {
            name: 'Umber',
          },
          relationships: {},
        },
      ],
      included: [],
    });
    assert.strictEqual(homePlanetNormalizeCount, 1, 'homePlanet is normalized once');
  });

  testInDebug('normalizeResponse warning with custom modelNameFromPayloadKey', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    var homePlanet;
    var oldModelNameFromPayloadKey = serializer.modelNameFromPayloadKey;
    this.owner.register('serializer:super-villain', JSONSerializer.extend());
    this.owner.register('serializer:home-planet', JSONSerializer.extend());

    serializer.modelNameFromPayloadKey = function (root) {
      //return some garbage that won"t resolve in the container
      return 'garbage';
    };

    var jsonHash = {
      home_planet: { id: '1', name: 'Umber', superVillains: [1] },
    };

    assert.expectWarning(
      bind(null, function () {
        run(function () {
          serializer.normalizeResponse(store, store.modelFor('home-planet'), jsonHash, '1', 'findRecord');
        });
      }),
      /Encountered "home_planet" in payload, but no model was found for model name "garbage"/
    );

    // should not warn if a model is found.
    serializer.modelNameFromPayloadKey = oldModelNameFromPayloadKey;
    jsonHash = {
      home_planet: { id: '1', name: 'Umber', superVillains: [1] },
    };

    assert.expectNoWarning(function () {
      run(function () {
        homePlanet = serializer.normalizeResponse(store, store.modelFor('home-planet'), jsonHash, 1, 'findRecord');
      });
    });

    assert.strictEqual(homePlanet.data.attributes.name, 'Umber');
    assert.deepEqual(homePlanet.data.relationships.superVillains.data, [{ id: '1', type: 'super-villain' }]);
  });

  testInDebug('normalizeResponse warning with custom modelNameFromPayloadKey', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    var homePlanets;
    this.owner.register('serializer:super-villain', JSONSerializer);
    this.owner.register('serializer:home-planet', JSONSerializer);
    serializer.modelNameFromPayloadKey = function (root) {
      //return some garbage that won"t resolve in the container
      return 'garbage';
    };

    var jsonHash = {
      home_planets: [{ id: '1', name: 'Umber', superVillains: [1] }],
    };

    assert.expectWarning(function () {
      serializer.normalizeResponse(store, store.modelFor('home-planet'), jsonHash, null, 'findAll');
    }, /Encountered "home_planets" in payload, but no model was found for model name "garbage"/);

    // should not warn if a model is found.
    serializer.modelNameFromPayloadKey = function (root) {
      return camelize(singularize(root));
    };

    jsonHash = {
      home_planets: [{ id: '1', name: 'Umber', superVillains: [1] }],
    };

    assert.expectNoWarning(function () {
      run(function () {
        homePlanets = serializer.normalizeResponse(store, store.modelFor('home-planet'), jsonHash, null, 'findAll');
      });
    });

    assert.strictEqual(homePlanets.data.length, 1);
    assert.strictEqual(homePlanets.data[0].attributes.name, 'Umber');
    assert.deepEqual(homePlanets.data[0].relationships.superVillains.data, [{ id: '1', type: 'super-villain' }]);
  });

  test('serialize polymorphicType', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    let tom = store.createRecord('yellow-minion', { name: 'Alex', id: '124' });
    let ray = store.createRecord('doomsday-device', { evilMinion: tom, name: 'DeathRay' });
    let json = serializer.serialize(ray._createSnapshot());

    assert.deepEqual(json, {
      name: 'DeathRay',
      evilMinionType: 'yellowMinion',
      evilMinion: '124',
    });
  });

  test('serialize polymorphicType with decamelized modelName', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    let tom = store.createRecord('yellow-minion', { name: 'Alex', id: '124' });
    let ray = store.createRecord('doomsday-device', { evilMinion: tom, name: 'DeathRay' });
    let json = serializer.serialize(ray._createSnapshot());

    assert.deepEqual(json['evilMinionType'], 'yellowMinion');
  });

  test('serialize polymorphic when associated object is null', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');
    let ray = store.createRecord('doomsday-device', { name: 'DeathRay' });
    let json = serializer.serialize(ray._createSnapshot());

    assert.deepEqual(json['evilMinionType'], null);
  });

  test('normalizeResponse loads secondary records with correct serializer', function (assert) {
    var superVillainNormalizeCount = 0;

    this.owner.register('serializer:evil-minion', JSONSerializer);
    this.owner.register(
      'serializer:super-villain',
      RESTSerializer.extend({
        normalize() {
          superVillainNormalizeCount++;
          return this._super.apply(this, arguments);
        },
      })
    );

    var jsonHash = {
      evilMinion: { id: '1', name: 'Tom Dale', superVillain: 1 },
      superVillains: [{ id: '1', firstName: 'Yehuda', lastName: 'Katz', homePlanet: '1' }],
    };

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      serializer.normalizeResponse(store, store.modelFor('evil-minion'), jsonHash, '1', 'findRecord');
    });

    assert.strictEqual(superVillainNormalizeCount, 1, 'superVillain is normalized once');
  });

  test('normalizeResponse returns null if payload contains null', function (assert) {
    assert.expect(1);

    var jsonHash = {
      evilMinion: null,
    };
    var value;

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      value = serializer.normalizeResponse(store, store.modelFor('evil-minion'), jsonHash, null, 'findRecord');
    });

    assert.deepEqual(value, { data: null, included: [] }, 'returned value is null');
  });

  test('normalizeResponse loads secondary records with correct serializer', function (assert) {
    var superVillainNormalizeCount = 0;

    this.owner.register('serializer:evil-minion', JSONSerializer);
    this.owner.register(
      'serializer:super-villain',
      RESTSerializer.extend({
        normalize() {
          superVillainNormalizeCount++;
          return this._super.apply(this, arguments);
        },
      })
    );

    var jsonHash = {
      evilMinions: [{ id: '1', name: 'Tom Dale', superVillain: 1 }],
      superVillains: [{ id: '1', firstName: 'Yehuda', lastName: 'Katz', homePlanet: '1' }],
    };

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      serializer.normalizeResponse(store, store.modelFor('evil-minion'), jsonHash, null, 'findAll');
    });

    assert.strictEqual(superVillainNormalizeCount, 1, 'superVillain is normalized once');
  });

  test('normalizeResponse can handle large included arrays', function (assert) {
    this.owner.register('serializer:super-villain', RESTSerializer);
    this.owner.register('serializer:evil-minion', RESTSerializer);

    let evilMinions = [];
    // The actual stack size seems to vary based on browser and potenetially hardware and
    // other factors. This number should be large enough to always be an issue.
    let stackOverflowSize = 130000;
    for (let i = 0; i < stackOverflowSize; i++) {
      evilMinions.push({ id: i.toString(), superVillain: 1 });
    }

    let jsonHash = {
      superVillains: [{ id: '1', firstName: 'Yehuda', lastName: 'Katz', homePlanet: '1' }],
      evilMinions,
    };

    let superVillain;
    try {
      let store = this.owner.lookup('service:store');
      let serializer = store.serializerFor('application');
      superVillain = serializer.normalizeResponse(store, store.modelFor('super-villain'), jsonHash, null, 'findAll');
    } catch (err) {
      assert.ok(false, `normalizeResponse could not handle included length of ${stackOverflowSize}`);
      // Rethrow to provide stack trace to test output
      throw err;
    }

    assert.strictEqual(superVillain.included.length, stackOverflowSize);
  });

  test('normalize should allow for different levels of normalization', function (assert) {
    this.owner.register(
      'serializer:evil-minion',
      RESTSerializer.extend({
        attrs: {
          superVillain: 'is_super_villain',
        },
        keyForAttribute(attr) {
          return decamelize(attr);
        },
      })
    );

    var jsonHash = {
      evilMinions: [{ id: '1', name: 'Tom Dale', is_super_villain: 1 }],
    };
    var array;

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      array = serializer.normalizeResponse(store, store.modelFor('evil-minion'), jsonHash, null, 'findAll');
    });

    assert.strictEqual(array.data[0].relationships.superVillain.data.id, '1');
  });

  test('normalize should allow for different levels of normalization - attributes', function (assert) {
    this.owner.register(
      'serializer:evil-minion',
      RESTSerializer.extend({
        attrs: {
          name: 'full_name',
        },
        keyForAttribute(attr) {
          return decamelize(attr);
        },
      })
    );

    var jsonHash = {
      evilMinions: [{ id: '1', full_name: 'Tom Dale' }],
    };
    var array;

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      array = serializer.normalizeResponse(store, store.modelFor('evil-minion'), jsonHash, null, 'findAll');
    });

    assert.strictEqual(array.data[0].attributes.name, 'Tom Dale');
  });

  test('serializeIntoHash', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');
    let league = store.createRecord('home-planet', { name: 'Umber', id: '123' });
    let json = {};

    serializer.serializeIntoHash(json, store.modelFor('home-planet'), league._createSnapshot());

    assert.deepEqual(json, {
      homePlanet: {
        name: 'Umber',
      },
    });
  });

  test('serializeIntoHash with decamelized modelName', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    let league = store.createRecord('home-planet', { name: 'Umber', id: '123' });
    let json = {};

    serializer.serializeIntoHash(json, store.modelFor('home-planet'), league._createSnapshot());

    assert.deepEqual(json, {
      homePlanet: {
        name: 'Umber',
      },
    });
  });

  test('serializeBelongsTo with async polymorphic', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    let json = {};
    let expected = { evilMinion: '1', evilMinionType: 'evilMinion' };
    let evilMinion = store.createRecord('evil-minion', { id: '1', name: 'Tomster' });
    let doomsdayDevice = store.createRecord('doomsday-device', {
      id: '2',
      name: 'Yehuda',
      evilMinion: evilMinion,
    });

    serializer.serializeBelongsTo(doomsdayDevice._createSnapshot(), json, {
      key: 'evilMinion',
      options: { polymorphic: true, async: true },
    });

    assert.deepEqual(json, expected, 'returned JSON is correct');
  });

  test('keyForPolymorphicType can be used to overwrite how the type of a polymorphic record is serialized', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    let json = {};
    let expected = { evilMinion: '1', typeForEvilMinion: 'evilMinion' };

    serializer.keyForPolymorphicType = function () {
      return 'typeForEvilMinion';
    };

    let evilMinion = store.createRecord('evil-minion', { id: '1', name: 'Tomster' });
    let doomsdayDevice = store.createRecord('doomsday-device', {
      id: '2',
      name: 'Yehuda',
      evilMinion: evilMinion,
    });

    serializer.serializeBelongsTo(doomsdayDevice._createSnapshot(), json, {
      key: 'evilMinion',
      options: { polymorphic: true, async: true },
    });

    assert.deepEqual(json, expected, 'returned JSON is correct');
  });

  test('keyForPolymorphicType can be used to overwrite how the type of a polymorphic record is looked up for normalization', function (assert) {
    var json = {
      doomsdayDevice: {
        id: '1',
        evilMinion: '2',
        typeForEvilMinion: 'evilMinion',
      },
    };

    var expected = {
      data: {
        type: 'doomsday-device',
        id: '1',
        attributes: {},
        relationships: {
          evilMinion: {
            data: {
              type: 'evil-minion',
              id: '2',
            },
          },
        },
      },
      included: [],
    };

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    serializer.keyForPolymorphicType = function () {
      return 'typeForEvilMinion';
    };

    var normalized = serializer.normalizeResponse(store, store.modelFor('doomsday-device'), json, null, 'findRecord');

    assert.deepEqual(normalized, expected, 'normalized JSON is correct');
  });

  test('serializeIntoHash uses payloadKeyFromModelName to normalize the payload root key', function (assert) {
    let store = this.owner.lookup('service:store');
    let league = store.createRecord('home-planet', { name: 'Umber', id: '123' });
    let json = {};

    this.owner.register(
      'serializer:home-planet',
      RESTSerializer.extend({
        payloadKeyFromModelName(modelName) {
          return dasherize(modelName);
        },
      })
    );

    let serializer = store.serializerFor('home-planet');

    serializer.serializeIntoHash(json, store.modelFor('home-planet'), league._createSnapshot());

    assert.deepEqual(json, {
      'home-planet': {
        name: 'Umber',
      },
    });
  });

  test('normalizeResponse with async polymorphic belongsTo, using <relationshipName>Type', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = (store, type) => {
      if (type.modelName === 'doomsday-device') {
        return {
          doomsdayDevice: {
            id: '1',
            name: 'DeathRay',
            evilMinion: 1,
            evilMinionType: 'yellowMinion',
          },
        };
      }

      assert.strictEqual(type.modelName, 'yellow-minion');

      return {
        yellowMinion: {
          id: '1',
          type: 'yellowMinion',
          name: 'Alex',
          eyes: 3,
        },
      };
    };

    run(function () {
      store
        .findRecord('doomsday-device', 1)
        .then((deathRay) => {
          return deathRay.evilMinion;
        })
        .then((evilMinion) => {
          assert.strictEqual(evilMinion.eyes, 3);
        });
    });
  });

  test('normalizeResponse with async polymorphic belongsTo', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = () => {
      return {
        doomsdayDevices: [
          {
            id: '1',
            name: 'DeathRay',
            links: {
              evilMinion: '/doomsday-device/1/evil-minion',
            },
          },
        ],
      };
    };

    adapter.findBelongsTo = () => {
      return {
        evilMinion: {
          id: '1',
          type: 'yellowMinion',
          name: 'Alex',
          eyes: 3,
        },
      };
    };

    run(function () {
      store
        .findRecord('doomsday-device', 1)
        .then((deathRay) => {
          return deathRay.evilMinion;
        })
        .then((evilMinion) => {
          assert.strictEqual(evilMinion.eyes, 3);
        });
    });
  });

  test('normalizeResponse with async polymorphic hasMany', function (assert) {
    class HomePlanet extends Model {
      @attr('string') name;
      @hasMany('super-villain', { async: false, inverse: 'homePlanet' }) superVillains;
    }
    class SuperVillain extends Model {
      @attr('string') firstName;
      @attr('string') lastName;
      @belongsTo('home-planet', { async: false, inverse: 'superVillains' }) homePlanet;
      @hasMany('evil-minion', { async: true, polymorphic: true, inverse: 'superVillain' }) evilMinions;
    }
    class EvilMinion extends Model {
      @attr('string') name;
      @belongsTo('super-villain', { async: false, inverse: 'evilMinions', as: 'evil-minion' }) superVillain;
    }
    class YellowMinion extends EvilMinion {
      @attr('number') eyes;
    }

    this.owner.register('model:super-villain', SuperVillain);
    this.owner.register('model:home-planet', HomePlanet);
    this.owner.register('model:evil-minion', EvilMinion);
    this.owner.register('model:yellow-minion', YellowMinion);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = () => {
      return {
        superVillains: [
          {
            id: '1',
            firstName: 'Yehuda',
            lastName: 'Katz',
            links: {
              evilMinions: '/super-villain/1/evil-minions',
            },
          },
        ],
      };
    };

    adapter.findHasMany = () => {
      return {
        evilMinion: [
          {
            id: '1',
            type: 'yellowMinion',
            name: 'Alex',
            eyes: 3,
          },
        ],
      };
    };

    run(function () {
      store
        .findRecord('super-villain', '1')
        .then((superVillain) => {
          return superVillain.evilMinions;
        })
        .then((evilMinions) => {
          assert.ok(evilMinions.at(0) instanceof YellowMinion, 'we have an instance');
          assert.strictEqual(evilMinions.at(0).eyes, 3, 'we have the right minion');
        });
    });
  });

  test('normalizeResponse can load secondary records of the same type without affecting the query count', function (assert) {
    var jsonHash = {
      comments: [{ id: '1', body: 'Parent Comment', root: true, children: [2, 3] }],
      _comments: [
        { id: '2', body: 'Child Comment 1', root: false },
        { id: '3', body: 'Child Comment 2', root: false },
      ],
    };
    var array;
    this.owner.register('serializer:comment', JSONSerializer);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      array = serializer.normalizeResponse(store, Comment, jsonHash, '1', 'findRecord');
    });

    assert.deepEqual(array, {
      data: {
        id: '1',
        type: 'comment',
        attributes: {
          body: 'Parent Comment',
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
            body: 'Child Comment 1',
            root: false,
          },
          relationships: {},
        },
        {
          id: '3',
          type: 'comment',
          attributes: {
            body: 'Child Comment 2',
            root: false,
          },
          relationships: {},
        },
      ],
    });
  });

  test("don't polymorphically deserialize base on the type key in payload when a type attribute exist", function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      store.push(
        serializer.normalizeArrayResponse(store, store.modelFor('basket'), {
          basket: [
            { type: 'bamboo', size: 10, id: '1' },
            { type: 'yellowMinion', size: 10, id: '65536' },
          ],
        })
      );
    });

    const normalRecord = store.peekRecord('basket', '1');
    assert.ok(normalRecord, "payload with type that doesn't exist");
    assert.strictEqual(normalRecord.type, 'bamboo');
    assert.strictEqual(normalRecord.size, 10);

    const clashingRecord = store.peekRecord('basket', '65536');
    assert.ok(clashingRecord, 'payload with type that matches another model name');
    assert.strictEqual(clashingRecord.type, 'yellowMinion');
    assert.strictEqual(clashingRecord.size, 10);
  });

  test("don't polymorphically deserialize base on the type key in payload when a type attribute exist on a singular response", function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      store.push(
        serializer.normalizeSingleResponse(
          store,
          store.modelFor('basket'),
          {
            basket: { type: 'yellowMinion', size: 10, id: '65536' },
          },
          '65536'
        )
      );
    });

    const clashingRecord = store.peekRecord('basket', '65536');
    assert.ok(clashingRecord, 'payload with type that matches another model name');
    assert.strictEqual(clashingRecord.type, 'yellowMinion');
    assert.strictEqual(clashingRecord.size, 10);
  });

  test("don't polymorphically deserialize based on the type key in payload when a relationship exists named type", function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = () => {
      return {
        containers: [{ id: '42', volume: '10 liters', type: 1 }],
        baskets: [{ id: '1', size: 4 }],
      };
    };
    const Basket = store.modelFor('basket');

    run(function () {
      store
        .findRecord('container', 42)
        .then((container) => {
          assert.strictEqual(container.volume, '10 liters');
          return container.type;
        })
        .then((basket) => {
          assert.ok(basket instanceof Basket);
          assert.strictEqual(basket.size, 4);
        });
    });
  });

  test('Serializer should respect the attrs hash in links', function (assert) {
    this.owner.register(
      'serializer:super-villain',
      RESTSerializer.extend({
        attrs: {
          evilMinions: { key: 'my_minions' },
        },
      })
    );

    var jsonHash = {
      'super-villains': [
        {
          firstName: 'Tom',
          lastName: 'Dale',
          links: {
            my_minions: 'me/minions',
          },
        },
      ],
    };

    let store = this.owner.lookup('service:store');

    var documentHash = store
      .serializerFor('super-villain')
      .normalizeSingleResponse(store, store.modelFor('super-villain'), jsonHash);

    assert.strictEqual(documentHash.data.relationships.evilMinions.links.related, 'me/minions');
  });

  // https://github.com/emberjs/data/issues/3805
  test('normalizes sideloaded single record so that it sideloads correctly - belongsTo - GH-3805', function (assert) {
    this.owner.register('serializer:evil-minion', JSONSerializer);
    this.owner.register('serializer:doomsday-device', RESTSerializer.extend());

    let payload = {
      doomsdayDevice: {
        id: '1',
        evilMinion: 2,
      },
      evilMinion: {
        id: '2',
        doomsdayDevice: 1,
      },
    };

    let store = this.owner.lookup('service:store');
    let document = store
      .serializerFor('doomsday-device')
      .normalizeSingleResponse(store, store.modelFor('doomsday-device'), payload);

    assert.strictEqual(document.data.relationships.evilMinion.data.id, '2');
    assert.strictEqual(document.included.length, 1);
    assert.deepEqual(document.included[0], {
      attributes: {},
      id: '2',
      type: 'evil-minion',
      relationships: {
        doomsdayDevice: {
          data: {
            id: '1',
            type: 'doomsday-device',
          },
        },
      },
    });
  });

  // https://github.com/emberjs/data/issues/3805
  test('normalizes sideloaded single record so that it sideloads correctly - hasMany - GH-3805', function (assert) {
    this.owner.register('serializer:super-villain', JSONSerializer);
    this.owner.register('serializer:home-planet', RESTSerializer.extend());

    let payload = {
      homePlanet: {
        id: '1',
        superVillains: [2],
      },
      superVillain: {
        id: '2',
        homePlanet: 1,
      },
    };

    let store = this.owner.lookup('service:store');
    let document = store
      .serializerFor('home-planet')
      .normalizeSingleResponse(store, store.modelFor('home-planet'), payload);

    assert.strictEqual(document.data.relationships.superVillains.data.length, 1);
    assert.strictEqual(document.data.relationships.superVillains.data[0].id, '2');
    assert.strictEqual(document.included.length, 1);
    assert.deepEqual(document.included[0], {
      attributes: {},
      id: '2',
      type: 'super-villain',
      relationships: {
        homePlanet: {
          data: {
            id: '1',
            type: 'home-planet',
          },
        },
      },
    });
  });
});
