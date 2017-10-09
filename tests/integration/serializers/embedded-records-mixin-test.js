import { w } from '@ember/string';
import { run } from '@ember/runloop';
import { get } from '@ember/object';
import setupStore from 'dummy/tests/helpers/store';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

import DS from 'ember-data';

var HomePlanet, SuperVillain, CommanderVillain, NormalMinion, EvilMinion, YellowMinion, RedMinion, SecretLab, SecretWeapon, BatCave, Comment,
  league, superVillain, commanderVillain, evilMinion, yellowMinion, redMinion, secretWeapon, homePlanet, secretLab, env;
var LightSaber;

module("integration/embedded_records_mixin - EmbeddedRecordsMixin", {
  beforeEach() {
    SuperVillain = DS.Model.extend({
      firstName:       DS.attr('string'),
      lastName:        DS.attr('string'),
      homePlanet:      DS.belongsTo('home-planet', { inverse: 'villains', async: true }),
      secretLab:       DS.belongsTo('secret-lab', { async: false }),
      secretWeapons:   DS.hasMany('secret-weapon', { async: false }),
      evilMinions:     DS.hasMany('evil-minion', { async: false })
    });
    HomePlanet = DS.Model.extend({
      name:            DS.attr('string'),
      villains:        DS.hasMany('super-villain', { inverse: 'homePlanet', async: false })
    });
    SecretLab = DS.Model.extend({
      minionCapacity:  DS.attr('number'),
      vicinity:        DS.attr('string'),
      superVillain:    DS.belongsTo('super-villain', { async: false })
    });
    BatCave = SecretLab.extend({
      infiltrated:     DS.attr('boolean')
    });
    SecretWeapon = DS.Model.extend({
      name:            DS.attr('string'),
      superVillain:    DS.belongsTo('super-villain', { async: false })
    });
    LightSaber = SecretWeapon.extend({
      color:           DS.attr('string')
    });
    EvilMinion = DS.Model.extend({
      superVillain:    DS.belongsTo('super-villain', { async: false }),
      name:            DS.attr('string')
    });
    NormalMinion = DS.Model.extend({
      name: DS.attr('string')
    });
    YellowMinion = NormalMinion.extend();
    RedMinion = NormalMinion.extend();
    CommanderVillain = DS.Model.extend({
      name: DS.attr('string'),
      minions: DS.hasMany('normal-minion', { polymorphic: true })
    });
    Comment = DS.Model.extend({
      body:            DS.attr('string'),
      root:            DS.attr('boolean'),
      children:        DS.hasMany('comment', { inverse: null, async: false })
    });
    env = setupStore({
      superVillain:     SuperVillain,
      commanderVillain: CommanderVillain,
      homePlanet:       HomePlanet,
      secretLab:        SecretLab,
      batCave:          BatCave,
      secretWeapon:     SecretWeapon,
      lightSaber:       LightSaber,
      evilMinion:       EvilMinion,
      normalMinion:     NormalMinion,
      yellowMinion:     YellowMinion,
      redMinion:        RedMinion,
      comment:          Comment
    });
    env.store.modelFor('super-villain');
    env.store.modelFor('commander-villain');
    env.store.modelFor('home-planet');
    env.store.modelFor('secret-lab');
    env.store.modelFor('bat-cave');
    env.store.modelFor('secret-weapon');
    env.store.modelFor('light-saber');
    env.store.modelFor('evil-minion');
    env.store.modelFor('comment');

    env.registry.register('adapter:application', DS.RESTAdapter);
    env.registry.register('serializer:application', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin));

    //env.amsSerializer = env.container.lookup("serializer:-active-model");
    //env.amsAdapter    = env.container.lookup("adapter:-active-model");
  },

  afterEach() {
    run(env.store, 'destroy');
  }
});

test("normalizeResponse with embedded objects", function(assert) {
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "2",
        firstName: "Tom",
        lastName: "Dale"
      }]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "2", "type": "super-villain" }
          ]
        }
      }
    },
    "included": [
      {
        "id": "2",
        "type": "super-villain",
        "attributes": {
          "firstName": "Tom",
          "lastName": "Dale"
        },
        "relationships": {}
      }
    ]
  });
});

test("normalizeResponse with embedded objects inside embedded objects", function(assert) {
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "2",
        firstName: "Tom",
        lastName: "Dale",
        evilMinions: [{
          id: "3",
          name: "Alex"
        }]
      }]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "2", "type": "super-villain" }
          ]
        }
      }
    },
    "included": [{
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "evilMinions": {
          "data": [
            { "id": "3", "type": "evil-minion" }
          ]
        }
      }
    }, {
      "id": "3",
      "type": "evil-minion",
      "attributes": {
        "name": "Alex"
      },
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects of same type", function(assert) {
  env.registry.register('serializer:comment', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("comment");

  var json_hash = {
    comment: {
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false
      }, {
        id: "3",
        body: "Foo",
        root: false
      }]
    }
  };
  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, Comment, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "comment",
      "attributes": {
        "body": "Hello",
        "root": true
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "2", "type": "comment" },
            { "id": "3", "type": "comment" }
          ]
        }
      }
    },
    "included": [{
      "id": "2",
      "type": "comment",
      "attributes": {
        "body": "World",
        "root": false
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "comment",
      "attributes": {
        "body": "Foo",
        "root": false
      },
      "relationships": {}
    }]
  }, "Primary record was correct");
});

test("normalizeResponse with embedded objects inside embedded objects of same type", function(assert) {
  env.registry.register('serializer:comment', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("comment");
  var json_hash = {
    comment: {
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false,
        children: [{
          id: "4",
          body: "Another",
          root: false
        }]
      }, {
        id: "3",
        body: "Foo",
        root: false
      }]
    }
  };
  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, Comment, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "comment",
      "attributes": {
        "body": "Hello",
        "root": true
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "2", "type": "comment" },
            { "id": "3", "type": "comment" }
          ]
        }
      }
    },
    "included": [{
      "id": "2",
      "type": "comment",
      "attributes": {
        "body": "World",
        "root": false
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "4", "type": "comment" }
          ]
        }
      }
    }, {
      "id": "4",
      "type": "comment",
      "attributes": {
        "body": "Another",
        "root": false
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "comment",
      "attributes": {
        "body": "Foo",
        "root": false
      },
      "relationships": {}
    }]
  }, "Primary record was correct");
});

test("normalizeResponse with embedded objects of same type, but from separate attributes", function(assert) {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain', { inverse: null, async: false })
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' },
      reformedVillains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        firstName: "Tom"
      }, {
        id: "3",
        firstName: "Yehuda"
      }],
      reformedVillains: [{
        id: "2",
        firstName: "Alex"
      },{
        id: "4",
        firstName: "Erik"
      }]
    }
  };
  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Earth"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" },
            { "id": "3", "type": "super-villain" }
          ]
        },
        "reformedVillains": {
          "data": [
            { "id": "2", "type": "super-villain" },
            { "id": "4", "type": "super-villain" }
          ]
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom"
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "super-villain",
      "attributes": {
        "firstName": "Yehuda"
      },
      "relationships": {}
    }, {
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Alex"
      },
      "relationships": {}
    }, {
      "id": "4",
      "type": "super-villain",
      "attributes": {
        "firstName": "Erik"
      },
      "relationships": {}
    }]
  }, "Primary hash was correct");
});

test("normalizeResponse with embedded objects", function(assert) {
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        firstName: "Tom",
        lastName: "Dale"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  assert.deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" }
          ]
        }
      }
    }],
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects with custom primary key", function(assert) {
  assert.expect(1);
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend({
    primaryKey: 'villain_id'
  }));
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        villain_id: "2",
        firstName: "Alex",
        lastName: "Baizeau"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  assert.deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "2", "type": "super-villain" }
          ]
        }
      }
    }],
    "included": [{
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Alex",
        "lastName": "Baizeau"
      },
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects with identical relationship and attribute key ", function(assert) {
  assert.expect(1);
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    },
    //Makes the keyForRelationship and keyForAttribute collide.
    keyForRelationship(key, type) {
      return this.keyForAttribute(key, type);
    }
  }));

  var serializer = env.store.serializerFor("home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        firstName: "Alex",
        lastName: "Baizeau"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  assert.deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" }
          ]
        }
      }
    }],
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Alex",
        "lastName": "Baizeau"
      },
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects of same type as primary type", function(assert) {
  env.registry.register('serializer:comment', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("comment");

  var json_hash = {
    comments: [{
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false
      }, {
        id: "3",
        body: "Foo",
        root: false
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeResponse(env.store, Comment, json_hash, null, 'findAll');
  });

  assert.deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "comment",
      "attributes": {
        "body": "Hello",
        "root": true
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "2", "type": "comment" },
            { "id": "3", "type": "comment" }
          ]
        }
      }
    }],
    "included": [{
      "id": "2",
      "type": "comment",
      "attributes": {
        "body": "World",
        "root": false
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "comment",
      "attributes": {
        "body": "Foo",
        "root": false
      },
      "relationships": {}
    }]
  }, "Primary array is correct");
});

test("normalizeResponse with embedded objects of same type, but from separate attributes", function(assert) {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain', { async: false })
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' },
      reformedVillains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        firstName: "Tom"
      },{
        id: "3",
        firstName: "Yehuda"
      }],
      reformedVillains: [{
        id: "2",
        firstName: "Alex"
      },{
        id: "4",
        firstName: "Erik"
      }]
    },{
      id: "2",
      name: "Mars",
      villains: [{
        id: "1",
        firstName: "Tom"
      },{
        id: "3",
        firstName: "Yehuda"
      }],
      reformedVillains: [{
        id: "5",
        firstName: "Peter"
      },{
        id: "6",
        firstName: "Trek"
      }]
    }]
  };

  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  assert.deepEqual(json, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Earth"
      },
      "relationships": {
        "reformedVillains": {
          "data": [
            { "id": "2", "type": "super-villain" },
            { "id": "4", "type": "super-villain" }
          ]
        },
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" },
            { "id": "3", "type": "super-villain" }
          ]
        }
      }
    }, {
      "id": "2",
      "type": "home-planet",
      "attributes": {
        "name": "Mars"
      },
      "relationships": {
        "reformedVillains": {
          "data": [
            { "id": "5", "type": "super-villain" },
            { "id": "6", "type": "super-villain" }
          ]
        },
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" },
            { "id": "3", "type": "super-villain" }
          ]
        }
      }
    }],
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom"
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "super-villain",
      "attributes": {
        "firstName": "Yehuda"
      },
      "relationships": {}
    }, {
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Alex"
      },
      "relationships": {}
    }, {
      "id": "4",
      "type": "super-villain",
      "attributes": {
        "firstName": "Erik"
      },
      "relationships": {}
    }, {
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom"
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "super-villain",
      "attributes": {
        "firstName": "Yehuda"
      },
      "relationships": {}
    }, {
      "id": "5",
      "type": "super-villain",
      "attributes": {
        "firstName": "Peter"
      },
      "relationships": {}
    }, {
      "id": "6",
      "type": "super-villain",
      "attributes": {
        "firstName": "Trek"
      },
      "relationships": {}
    }]
  }, "Primary array was correct");
});

test("serialize supports serialize:false on non-relationship properties", function(assert) {
  var tom;
  run(function() {
    tom = env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", id: '1' });
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      firstName: { serialize: false }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.store.serializerFor("super-villain");
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    lastName: "Dale",
    homePlanet: null,
    secretLab: null
  });
});

test("serialize with embedded objects (hasMany relationship)", function(assert) {
  var tom, league;
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    tom = env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", homePlanet: league, id: '1' });
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer, json;
  run(function() {
    serializer = env.store.serializerFor("home-planet");

    json = serializer.serialize(league._createSnapshot());
  });

  assert.deepEqual(json, {
    name: "Villain League",
    villains: [{
      id: get(tom, "id"),
      firstName: "Tom",
      lastName: "Dale",
      homePlanet: get(league, "id"),
      secretLab: null
    }]
  });
});

test("serialize with embedded objects and a custom keyForAttribute (hasMany relationship)", function(assert) {
  var tom, league;
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    tom = env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", homePlanet: league, id: '1' });
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    keyForRelationship(key) {
      return key + '-custom';
    },
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer, json;
  run(function() {
    serializer = env.store.serializerFor("home-planet");

    json = serializer.serialize(league._createSnapshot());
  });

  assert.deepEqual(json, {
    "name": "Villain League",
    "villains-custom": [{
      id: get(tom, "id"),
      firstName: "Tom",
      lastName: "Dale",
      homePlanet: get(league, "id"),
      secretLab: null
    }]
  });
});

testInDebug("serialize with embedded objects (unknown hasMany relationship)", function(assert) {
  var league;
  run(function() {
    env.store.push({
      data: {
        type: 'home-planet',
        id: '123',
        attributes: {
          name: "Villain League"
        }
      }
    });
    league = env.store.peekRecord('home-planet', 123);
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer, json;
  assert.expectWarning(function() {
    run(function() {
      serializer = env.store.serializerFor("home-planet");
      json = serializer.serialize(league._createSnapshot());
    });
  }, /The embedded relationship 'villains' is undefined for 'home-planet' with id '123'. Please include it in your original payload./);

  assert.deepEqual(json, {
    name: "Villain League",
    villains: []
  });
});

test("serialize with embedded objects (hasMany relationship) supports serialize:false", function(assert) {
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", homePlanet: league, id: '1' });
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { serialize: false }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.store.serializerFor("home-planet");

    json = serializer.serialize(league._createSnapshot());
  });

  assert.deepEqual(json, {
    name: "Villain League"
  });
});

test("serialize with (new) embedded objects (hasMany relationship)", function(assert) {
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", homePlanet: league });
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.store.serializerFor("home-planet");

    json = serializer.serialize(league._createSnapshot());
  });
  assert.deepEqual(json, {
    name: "Villain League",
    villains: [{
      firstName: "Tom",
      lastName: "Dale",
      homePlanet: get(league, "id"),
      secretLab: null
    }]
  });
});

test("serialize with embedded objects (hasMany relationships, including related objects not embedded)", function(assert) {
  run(function() {
    superVillain = env.store.createRecord('super-villain', { id: 1, firstName: "Super", lastName: "Villian" });
    evilMinion = env.store.createRecord('evil-minion', { id: 1, name: "Evil Minion", superVillian: superVillain });
    secretWeapon = env.store.createRecord('secret-weapon', { id: 1, name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
    superVillain.get('secretWeapons').pushObject(secretWeapon);
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { serialize: 'records', deserialize: 'records' },
      secretWeapons: { serialize: 'ids' }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.container.lookup("serializer:super-villain");

    json = serializer.serialize(superVillain._createSnapshot());
  });
  assert.deepEqual(json, {
    firstName: get(superVillain, "firstName"),
    lastName: get(superVillain, "lastName"),
    homePlanet: null,
    evilMinions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      superVillain: "1"
    }],
    secretLab: null,
    secretWeapons: ["1"]
  });
});

test("serialize has many relationship using the `ids-and-types` strategy", function(assert) {
  run(function() {
    yellowMinion = env.store.createRecord('yellow-minion', { id: 1, name: "Yellowy" });
    redMinion = env.store.createRecord('red-minion', { id: 1, name: "Reddy" });
    commanderVillain = env.store.createRecord('commander-villain', { id: 1, name: "Jeff", minions: [yellowMinion, redMinion] });
  });

  env.registry.register('serializer:commander-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      minions: { serialize: 'ids-and-types' }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.container.lookup("serializer:commander-villain");
    var snapshot = commanderVillain._createSnapshot();
    json = serializer.serialize(snapshot);
  });

  assert.deepEqual(json, {
    name: 'Jeff',
    minions: [{
      id: '1',
      type: 'yellow-minion'
    }, {
      id: '1',
      type: 'red-minion'
    }]
  });
});

test("normalizeResponse with embedded object (belongsTo relationship)", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    super_villain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      homePlanet: "123",
      evilMinions: ["1", "2", "3"],
      secretLab: {
        minionCapacity: 5000,
        vicinity: "California, USA",
        id: "101"
      },
      secretWeapons: []
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "evilMinions": {
          "data": [
            { "id": "1", "type": "evil-minion" },
            { "id": "2", "type": "evil-minion" },
            { "id": "3", "type": "evil-minion" }
          ]
        },
        "homePlanet": {
          "data": { "id": "123", "type": "home-planet" }
        },
        "secretLab": {
          "data": { "id": "101", "type": "secret-lab" }
        },
        "secretWeapons": {
          "data": []
        }
      }
    },
    "included": [{
      "id": "101",
      "type": "secret-lab",
      "attributes": {
        "minionCapacity": 5000,
        "vicinity": "California, USA"
      },
      "relationships": {}
    }]
  });
});

test("serialize with embedded object (belongsTo relationship)", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  var serializer, json, tom;
  run(function() {
    serializer = env.store.serializerFor("super-villain");

    // records with an id, persisted

    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: {
      id: get(tom, "secretLab").get("id"),
      minionCapacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("serialize with embedded object (polymorphic belongsTo relationship)", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));

  SuperVillain.reopen({
    secretLab: DS.belongsTo('secret-lab', { polymorphic: true })
  });

  var json, tom;
  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      {
        id: "1",
        firstName: "Tom",
        lastName: "Dale",
        secretLab: env.store.createRecord('bat-cave', {
          id: "101",
          minionCapacity: 5000,
          vicinity: "California, USA",
          infiltrated: true
        }),
        homePlanet: env.store.createRecord('home-planet', {
          id: "123",
          name: "Villain League"
        })
      }
    );
  });

  run(function() {
    json = tom.serialize();
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLabType: 'batCave',
    secretLab: {
      id: get(tom, "secretLab").get("id"),
      minionCapacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity"),
      infiltrated: true
    }
  });
});

test("serialize with embedded object (belongsTo relationship) works with different primaryKeys", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    primaryKey: '_id',
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:secret-lab', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    primaryKey: 'crazy_id'
  }));

  var serializer = env.store.serializerFor("super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: {
      crazy_id: get(tom, "secretLab").get("id"),
      minionCapacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("serialize with embedded object (belongsTo relationship, new no id)", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("super-villain");

  // records without ids, new
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: {
      minionCapacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("serialize with embedded object (polymorphic belongsTo relationship) supports serialize:ids", function(assert) {
  SuperVillain.reopen({
    secretLab: DS.belongsTo('secret-lab', { polymorphic: true })
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'ids' }
    }
  }));

  var tom, json;
  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('bat-cave', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = tom.serialize();
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: get(tom, "secretLab").get("id"),
    secretLabType: 'batCave'
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:id", function(assert) {
  SuperVillain.reopen({
    secretLab: DS.belongsTo('secret-lab', { polymorphic: true })
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'id' }
    }
  }));

  var tom, json;
  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('bat-cave', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = tom.serialize();
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: get(tom, "secretLab").get("id"),
    secretLabType: 'batCave'
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:id in conjunction with deserialize:records", function(assert) {
  SuperVillain.reopen({
    secretLab: DS.belongsTo('secret-lab', { polymorphic: true })
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'id', deserialize: 'records' }
    }
  }));

  var tom, json;
  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('bat-cave', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = tom.serialize();
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: get(tom, "secretLab").get("id"),
    secretLabType: 'batCave'
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:ids", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'ids' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:id", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'id' }
    }
  }));

  var serializer = env.store.serializerFor("super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:id in conjunction with deserialize:records", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'id', deserialize: 'records' }
    }
  }));

  var serializer = env.store.serializerFor("super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:false", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: false }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");


  // records with an id, persisted
  var tom, json;
  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) serializes the id by default if no option specified", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin));
  var serializer = env.store.serializerFor("super-villain");

  // records with an id, persisted

  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: get(tom, "secretLab").get("id")
  });
});

test("when related record is not present, serialize embedded record (with a belongsTo relationship) as null", function(assert) {
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(tom, "firstName"),
    lastName: get(tom, "lastName"),
    homePlanet: get(tom, "homePlanet").get("id"),
    secretLab: null
  });
});

test("normalizeResponse with multiply-nested belongsTo", function(assert) {
  env.registry.register('serializer:evil-minion', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("evil-minion");
  var json_hash = {
    evilMinion: {
      id: "1",
      name: "Alex",
      superVillain: {
        id: "1",
        firstName: "Tom",
        lastName: "Dale",
        evilMinions: ["1"],
        homePlanet: {
          id: "1",
          name: "Umber",
          villains: ["1"]
        }
      }
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, EvilMinion, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "evil-minion",
      "attributes": {
        "name": "Alex"
      },
      "relationships": {
        "superVillain": {
          "data": { "id": "1", "type": "super-villain" }
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "evilMinions": {
          "data": [
            { "id": "1", "type": "evil-minion" }
          ]
        },
        "homePlanet": {
          "data": { "id": "1", "type": "home-planet" }
        }
      }
    }, {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" }
          ]
        }
      }
    }]
  }, "Primary hash was correct");
});

test("normalizeResponse with polymorphic hasMany", function(assert) {
  SuperVillain.reopen({
    secretWeapons: DS.hasMany("secretWeapon", { polymorphic: true, async: false })
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapons: { embedded: 'always' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    super_villain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      secretWeapons: [
        {
          id: "1",
          type: "LightSaber",
          name: "Tom's LightSaber",
          color: "Red"
        },
        {
          id: "1",
          type: "SecretWeapon",
          name: "The Death Star"
        }
      ]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findAll');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "secretWeapons": {
          "data": [
            { "id": "1", "type": "light-saber" },
            { "id": "1", "type": "secret-weapon" }
          ]
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "light-saber",
      "attributes": {
        "color": "Red",
        "name": "Tom's LightSaber"
      },
      "relationships": {}
    }, {
      "id": "1",
      "type": "secret-weapon",
      "attributes": {
        "name": "The Death Star"
      },
      "relationships": {}
    }]
  }, "Primary hash was correct");
});

test("normalizeResponse with polymorphic hasMany and custom primary key", function(assert) {
  SuperVillain.reopen({
    secretWeapons: DS.hasMany("secretWeapon", { polymorphic: true, async: false })
  });

  env.registry.register('serializer:light-saber', DS.RESTSerializer.extend({
    primaryKey: 'custom'
  }));
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapons: { embedded: 'always' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    super_villain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      secretWeapons: [
        {
          custom: "1",
          type: "LightSaber",
          name: "Tom's LightSaber",
          color: "Red"
        },
        {
          id: "1",
          type: "SecretWeapon",
          name: "The Death Star"
        }
      ]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "id": "1",
      "relationships": {
        "secretWeapons": {
          "data": [
            { "type": "light-saber", "id": "1" },
            { "type": "secret-weapon", "id": "1" }
          ]
        }
      },
      "type": "super-villain"
    },
    "included": [
      {
        "attributes": {
          "color": "Red",
          "name": "Tom's LightSaber"
        },
        "id": "1",
        "relationships": {},
        "type": "light-saber"
      },
      {
        "attributes": {
          "name": "The Death Star"
        },
        "id": "1",
        "relationships": {},
        "type": "secret-weapon"
      }
    ]
  }, "Custom primary key of embedded hasMany is correctly normalized");
});

test("normalizeResponse with polymorphic belongsTo", function(assert) {
  SuperVillain.reopen({
    secretLab: DS.belongsTo("secretLab", { polymorphic: true, async: true })
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    super_villain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      secretLab: {
        id: "1",
        type: "bat-cave",
        infiltrated: true
      }
    }
  };

  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "secretLab": {
          "data": { "id": "1", "type": "bat-cave" }
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "bat-cave",
      "attributes": {
        "infiltrated": true
      },
      "relationships": {}
    }]
  }, "Primary has was correct");
});

test("normalizeResponse with polymorphic belongsTo and custom primary key", function(assert) {
  assert.expect(1);

  SuperVillain.reopen({
    secretLab: DS.belongsTo("secretLab", { polymorphic: true, async: true })
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:bat-cave', DS.RESTSerializer.extend({
    primaryKey: 'custom'
  }));
  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    superVillain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      secretLab: {
        custom: "1",
        type: "bat-cave",
        infiltrated: true
      }
    }
  };

  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "id": "1",
      "relationships": {
        "secretLab": {
          "data": {
            "id": "1",
            "type": "bat-cave"
          }
        }
      },
      "type": "super-villain"
    },
    "included": [
      {
        "attributes": {
          "infiltrated": true
        },
        "id": "1",
        "relationships": {},
        "type": "bat-cave"
      }
    ]
  }, "Custom primary key is correctly normalized");
});

test("Mixin can be used with RESTSerializer which does not define keyForAttribute", function(assert) {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    secretLab = env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" });
    superVillain = env.store.createRecord('super-villain', {
      id: "1", firstName: "Super", lastName: "Villian", homePlanet: homePlanet, secretLab: secretLab
    });
    secretWeapon = env.store.createRecord('secret-weapon', { id: "1", name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('secretWeapons').pushObject(secretWeapon);
    evilMinion = env.store.createRecord('evil-minion', { id: "1", name: "Evil Minion", superVillian: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { serialize: 'records', deserialize: 'records' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");
  var json;

  run(function() {
    json = serializer.serialize(superVillain._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(superVillain, "firstName"),
    lastName: get(superVillain, "lastName"),
    homePlanet: "123",
    evilMinions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      superVillain: "1"
    }],
    secretLab: "101"
    // "manyToOne" relation does not serialize ids
    // sersecretWeapons: ["1"]
  });
});

test("normalize with custom belongsTo primary key", function(assert) {
  env.registry.register('serializer:evil-minion', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend({
    primaryKey: 'custom'
  }));

  var serializer = env.store.serializerFor("evil-minion");
  var json_hash = {
    evilMinion: {
      id: "1",
      name: "Alex",
      superVillain: {
        custom: "1",
        firstName: "Tom",
        lastName: "Dale"
      }
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, EvilMinion, json_hash, '1', 'findRecord');
  });

  assert.deepEqual(json, {
    "data": {
      "id": "1",
      "type": "evil-minion",
      "attributes": {
        "name": "Alex"
      },
      "relationships": {
        "superVillain": {
          "data": { "id": "1", "type": "super-villain" }
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {}
    }]
  }, "Primary hash was correct");
});

test("serializing relationships with an embedded and without calls super when not attr not present", function(assert) {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    secretLab = env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" });
    superVillain = env.store.createRecord('super-villain', {
      id: "1", firstName: "Super", lastName: "Villian", homePlanet: homePlanet, secretLab: secretLab
    });
    secretWeapon = env.store.createRecord('secret-weapon', { id: "1", name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('secretWeapons').pushObject(secretWeapon);
    evilMinion = env.store.createRecord('evil-minion', { id: "1", name: "Evil Minion", superVillian: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
  });

  var calledSerializeBelongsTo = false;
  var calledSerializeHasMany = false;

  var Serializer = DS.RESTSerializer.extend({
    serializeBelongsTo(snapshot, json, relationship) {
      calledSerializeBelongsTo = true;
      return this._super(snapshot, json, relationship);
    },
    serializeHasMany(snapshot, json, relationship) {
      calledSerializeHasMany = true;
      var key = relationship.key;
      var payloadKey = this.keyForRelationship ? this.keyForRelationship(key, "hasMany") : key;
      var relationshipType = snapshot.type.determineRelationshipType(relationship);
      // "manyToOne" not supported in DS.ActiveModelSerializer.prototype.serializeHasMany
      var relationshipTypes = w('manyToNone manyToMany manyToOne');
      if (relationshipTypes.indexOf(relationshipType) > -1) {
        json[payloadKey] = snapshot.hasMany(key, { ids: true });
      }
    }
  });
  env.registry.register('serializer:evil-minion', Serializer);
  env.registry.register('serializer:secret-weapon', Serializer);
  env.registry.register('serializer:super-villain', Serializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { serialize: 'records', deserialize: 'records' }
      // some relationships are not listed here, so super should be called on those
      // e.g. secretWeapons: { serialize: 'ids' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");

  var json;
  run(function() {
    json = serializer.serialize(superVillain._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: get(superVillain, "firstName"),
    lastName: get(superVillain, "lastName"),
    homePlanet: "123",
    evilMinions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      superVillain: "1"
    }],
    secretLab: "101",
    // customized serializeHasMany method to generate ids for "manyToOne" relation
    secretWeapons: ["1"]
  });
  assert.ok(calledSerializeBelongsTo);
  assert.ok(calledSerializeHasMany);
});

test("serializing belongsTo correctly removes embedded foreign key", function(assert) {
  SecretWeapon.reopen({
    superVillain: null
  });
  EvilMinion.reopen({
    secretWeapon: DS.belongsTo('secret-weapon', { async: false }),
    superVillain: null
  });

  run(function() {
    secretWeapon = env.store.createRecord('secret-weapon', { name: "Secret Weapon" });
    evilMinion = env.store.createRecord('evil-minion', { name: "Evil Minion", secretWeapon: secretWeapon });
  });

  env.registry.register('serializer:evil-minion', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapon: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("evil-minion");
  var json;

  run(function() {
    json = serializer.serialize(evilMinion._createSnapshot());
  });

  assert.deepEqual(json, {
    name: "Evil Minion",
    secretWeapon: {
      name: "Secret Weapon"
    }
  });
});


test("serializing embedded belongsTo respects remapped attrs key", function(assert) {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Hoth" });
    superVillain = env.store.createRecord('super-villain', { firstName: "Ice", lastName: "Creature", homePlanet: homePlanet });
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: { embedded: 'always', key: 'favorite_place' }
    }
  }));

  var serializer = env.store.serializerFor("super-villain");
  var json;

  run(function() {
    json = serializer.serialize(superVillain._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: "Ice",
    lastName: "Creature",
    favorite_place: {
      name: "Hoth"
    },
    secretLab: null
  });
});

test("serializing embedded hasMany respects remapped attrs key", function(assert) {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Hoth" });
    superVillain = env.store.createRecord('super-villain', { firstName: "Ice", lastName: "Creature", homePlanet: homePlanet });
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always', key: 'notable_persons' }
    }
  }));

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: { serialize: false },
      secretLab: { serialize: false }
    }
  }));


  var serializer = env.store.serializerFor("home-planet");
  var json;

  run(function() {
    json = serializer.serialize(homePlanet._createSnapshot());
  });

  assert.deepEqual(json, {
    name: "Hoth",
    notable_persons: [{
      firstName: 'Ice',
      lastName: 'Creature'
    }]
  });
});

test("serializing id belongsTo respects remapped attrs key", function(assert) {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Hoth" });
    superVillain = env.store.createRecord('super-villain', { firstName: "Ice", lastName: "Creature", homePlanet: homePlanet });
  });

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: { serialize: 'id', key: 'favorite_place' }
    }
  }));

  var serializer = env.store.serializerFor("super-villain");
  var json;

  run(function() {
    json = serializer.serialize(superVillain._createSnapshot());
  });

  assert.deepEqual(json, {
    firstName: "Ice",
    lastName: "Creature",
    favorite_place: homePlanet.id,
    secretLab: null
  });
});

test("serializing ids hasMany respects remapped attrs key", function(assert) {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Hoth" });
    superVillain = env.store.createRecord('super-villain', { firstName: "Ice", lastName: "Creature", homePlanet: homePlanet });
  });

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { serialize: 'ids', key: 'notable_persons' }
    }
  }));

  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: { serialize: false },
      secretLab: { serialize: false }
    }
  }));


  var serializer = env.store.serializerFor("home-planet");
  var json;

  run(function() {
    json = serializer.serialize(homePlanet._createSnapshot());
  });

  assert.deepEqual(json, {
    name: "Hoth",
    notable_persons: [superVillain.id]
  });
});
