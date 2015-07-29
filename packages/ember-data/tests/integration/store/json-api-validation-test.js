var Person, store, env;
var run = Ember.run;

module("integration/store/json-validation", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  teardown: function() {
    run(store, 'destroy');
  }
});

test("when normalizeResponse returns undefined (or doesn't return), throws an error", function() {

  env.registry.register('serializer:person', DS.Serializer.extend({
    isNewSerializerAPI: true,
    normalizeResponse() {}
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return Ember.RSVP.resolve({});
    }
  }));

  throws(function () {
    run(function() {
      store.find('person', 1);
    });
  }, /Top level of a JSON API document must be an object/);
});

test("when normalizeResponse returns null, throws an error", function() {

  env.registry.register('serializer:person', DS.Serializer.extend({
    isNewSerializerAPI: true,
    normalizeResponse() {return null;}
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return Ember.RSVP.resolve({});
    }
  }));

  throws(function () {
    run(function() {
      store.find('person', 1);
    });
  }, /Top level of a JSON API document must be an object/);
});


test("when normalizeResponse returns an empty object, throws an error", function() {

  env.registry.register('serializer:person', DS.Serializer.extend({
    isNewSerializerAPI: true,
    normalizeResponse() {return {};}
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return Ember.RSVP.resolve({});
    }
  }));

  throws(function () {
    run(function() {
      store.find('person', 1);
    });
  }, /One or more of the following keys must be present/);
});

test("when normalizeResponse returns a document with both data and errors, throws an error", function() {

  env.registry.register('serializer:person', DS.Serializer.extend({
    isNewSerializerAPI: true,
    normalizeResponse() {
      return {
        data: [],
        errors: []
      };
    }
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return Ember.RSVP.resolve({});
    }
  }));

  throws(function () {
    run(function() {
      store.find('person', 1);
    });
  }, /cannot both be present/);
});

function testPayloadError(payload, expectedError) {
  env.registry.register('serializer:person', DS.Serializer.extend({
    isNewSerializerAPI: true,
    normalizeResponse(store, type, pld) {
      return pld;
    }
  }));
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return Ember.RSVP.resolve(payload);
    }
  }));
  throws(function () {
    run(function() {
      store.find('person', 1);
    });
  }, expectedError, `Payload ${JSON.stringify(payload)} should throw error ${expectedError}`);
  env.registry.unregister('serializer:person');
  env.registry.unregister('adapter:person');
}

test("normalizeResponse 'data' cannot be undefined, a number, a string or a boolean", function() {

  testPayloadError({ data: undefined }, /data must be/);
  testPayloadError({ data: 1 }, /data must be/);
  testPayloadError({ data: 'lollerskates' }, /data must be/);
  testPayloadError({ data: true }, /data must be/);

});

test("normalizeResponse 'meta' cannot be an array, undefined, a number, a string or a boolean", function() {

  testPayloadError({ meta: undefined }, /meta must be an object/);
  testPayloadError({ meta: [] }, /meta must be an object/);
  testPayloadError({ meta: 1 }, /meta must be an object/);
  testPayloadError({ meta: 'lollerskates' }, /meta must be an object/);
  testPayloadError({ meta: true }, /meta must be an object/);

});

test("normalizeResponse 'links' cannot be an array, undefined, a number, a string or a boolean", function() {

  testPayloadError({ data: [], links: undefined }, /links must be an object/);
  testPayloadError({ data: [], links: [] }, /links must be an object/);
  testPayloadError({ data: [], links: 1 }, /links must be an object/);
  testPayloadError({ data: [], links: 'lollerskates' }, /links must be an object/);
  testPayloadError({ data: [], links: true }, /links must be an object/);

});

test("normalizeResponse 'jsonapi' cannot be an array, undefined, a number, a string or a boolean", function() {

  testPayloadError({ data: [], jsonapi: undefined }, /jsonapi must be an object/);
  testPayloadError({ data: [], jsonapi: [] }, /jsonapi must be an object/);
  testPayloadError({ data: [], jsonapi: 1 }, /jsonapi must be an object/);
  testPayloadError({ data: [], jsonapi: 'lollerskates' }, /jsonapi must be an object/);
  testPayloadError({ data: [], jsonapi: true }, /jsonapi must be an object/);

});

test("normalizeResponse 'included' cannot be an object, undefined, a number, a string or a boolean", function() {

  testPayloadError({ included: undefined }, /included must be an array/);
  testPayloadError({ included: {} }, /included must be an array/);
  testPayloadError({ included: 1 }, /included must be an array/);
  testPayloadError({ included: 'lollerskates' }, /included must be an array/);
  testPayloadError({ included: true }, /included must be an array/);

});

test("normalizeResponse 'errors' cannot be an object, undefined, a number, a string or a boolean", function() {

  testPayloadError({ errors: undefined }, /errors must be an array/);
  testPayloadError({ errors: {} }, /errors must be an array/);
  testPayloadError({ errors: 1 }, /errors must be an array/);
  testPayloadError({ errors: 'lollerskates' }, /errors must be an array/);
  testPayloadError({ errors: true }, /errors must be an array/);

});
