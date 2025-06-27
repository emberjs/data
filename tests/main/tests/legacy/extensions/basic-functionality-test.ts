import { computed } from '@ember/object';
import { cached, tracked } from '@glimmer/tracking';

import { module, test } from 'qunit';

import JSONAPICache from '@ember-data/json-api';
import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/build-config/deprecations';
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/legacy/model/migration-support';

class TestStore extends Store {
  requestManager = new RequestManager().use([Fetch]).useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}

module('Legacy | Extensions | EmberObject', function () {
  test('We can combine extensions on schema-object from both field and object-schema sources', function (assert) {
    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
      kind: 'object',
      name: 'do-thing-1',
      features: {
        doThingOne(this: { street: string }) {
          return `do-thing-1:${this.street}`;
        },
        doThingTwo(this: { street: string }) {
          return `do-thing-1:${this.street}`;
        },
      },
    });
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
      kind: 'object',
      name: 'do-thing-2',
      features: {
        doThingTwo(this: { street: string }) {
          return `do-thing-2:${this.street}`;
        },
      },
    });

    type WithMethods<T> = T & {
      doThingOne(): string;
      doThingTwo(): string;
    };

    store.schema.registerResources([
      {
        type: 'fragment:address',
        identity: null,
        fields: [
          {
            kind: 'field',
            name: 'street',
          },
        ],
        objectExtensions: ['do-thing-1'],
      },
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
          {
            kind: 'schema-object',
            name: 'address',
            type: 'fragment:address',
          },
          {
            kind: 'schema-object',
            name: 'businessAddress',
            type: 'fragment:address',
            options: {
              objectExtensions: ['do-thing-2'],
            },
          },
        ],
      }),
    ]);
    interface Address {
      street: string;
    }
    interface User {
      id: string;
      name: string;
      address: WithMethods<Address>;
      businessAddress: WithMethods<Address>;
      [Type]: 'user';
    }
    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          address: {
            street: 'Crowell',
          },
          businessAddress: {
            street: 'Hunter Mill',
          },
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user1.address?.street, 'Crowell');
    assert.strictEqual(user1.businessAddress?.street, 'Hunter Mill');

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.address.doThingOne(), 'do-thing-1:Crowell', 'object-schema extension works');
    assert.strictEqual(user1.address.doThingTwo(), 'do-thing-1:Crowell', 'object-schema extension works');
    assert.strictEqual(user1.businessAddress.doThingOne(), 'do-thing-1:Hunter Mill', 'object-schema extension works');
    assert.strictEqual(
      user1.businessAddress.doThingTwo(),
      'do-thing-2:Hunter Mill',
      'field extension overrides object-schema extension'
    );
  });

  test('We can use fields, decorators and getters as well as methods on objects', function (assert) {
    class Features {
      sayHello() {
        return 'hello!';
      }

      @tracked trackedField = 'initial tracked value';

      get realName() {
        const self = this as unknown as { name: string };
        return self.name;
      }
      set realName(v: string) {
        const self = this as unknown as { name: string };
        self.name = v;
      }

      get greeting() {
        const self = this as unknown as { name: string };
        return `hello ${self.name}!`;
      }

      @computed('name')
      get salutation() {
        const self = this as unknown as { name: string };
        return `salutations ${self.name}!`;
      }

      @cached
      get helloThere() {
        const self = this as unknown as { name: string };
        return `Well Hello There ${self.name}!`;
      }
    }
    // non-decorated fields dont appear on class prototypes as they are instance only
    // @ts-expect-error
    Features.prototype.untrackedField = 'initial untracked value';

    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
      kind: 'object',
      name: 'my-ext',
      features: Features,
    });

    type WithExt<T> = T & {
      sayHello(): string;
      realName: string;
      untrackedField: string;
      trackedField: string;
      readonly greeting: string;
      readonly salutation: string;
      readonly helloThere: string;
    };

    store.schema.registerResources([
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'field',
            name: 'name',
          },
        ],
        objectExtensions: ['my-ext'],
      }),
    ]);
    type User = WithExt<{
      id: string;
      name: string;
      [Type]: 'user';
    }>;

    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.name, 'Chris');

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.realName, 'Chris', 'getters with setters work');
    assert.strictEqual(user1.sayHello(), 'hello!', 'methods on class prototypes work');
    assert.strictEqual(user1.greeting, 'hello Chris!', 'getters on class prototypes work');
    assert.strictEqual(user1.salutation, 'salutations Chris!', 'computeds on class prototypes work');
    assert.strictEqual(user1.helloThere, 'Well Hello There Chris!', 'cached fields on class prototypes work');

    user1.name = 'James';

    // precondition, we updated
    assert.strictEqual(user1.name, 'James');

    // our getters including decorated getters should all update
    assert.strictEqual(user1.realName, 'James', 'getters with setters work');
    assert.strictEqual(user1.greeting, 'hello James!', 'getters on class prototypes work');
    assert.strictEqual(user1.salutation, 'salutations James!', 'computeds on class prototypes work');
    assert.strictEqual(user1.helloThere, 'Well Hello There James!', 'cached fields on class prototypes work');

    user1.realName = 'Chris';

    // our getters including decorated getters should all update
    assert.strictEqual(user1.name, 'Chris');
    assert.strictEqual(user1.realName, 'Chris', 'getters with setters work');
    assert.strictEqual(user1.greeting, 'hello Chris!', 'getters on class prototypes work');
    assert.strictEqual(user1.salutation, 'salutations Chris!', 'computeds on class prototypes work');
    assert.strictEqual(user1.helloThere, 'Well Hello There Chris!', 'cached fields on class prototypes work');

    // check mutable fields
    assert.strictEqual(user1.trackedField, 'initial tracked value', 'decorated value fields with initializers work');
    assert.strictEqual(
      user1.untrackedField,
      'initial untracked value',
      'undecorated value fields with initializers work'
    );
    user1.trackedField = 'updated value';
    assert.strictEqual(user1.trackedField, 'updated value', 'can update mutable-fields');
    user1.untrackedField = 'updated value';
    assert.strictEqual(user1.untrackedField, 'updated value', 'can update mutable-values');
  });

  test('We can use fields, decorators and getters as well as methods on arrays', function (assert) {
    class Features {
      sayHello() {
        return 'hello!';
      }

      @tracked trackedField = 'initial tracked value';

      get realName() {
        const self = this as unknown as Array<{ name: string }>;
        return self[0].name;
      }
      set realName(v: string) {
        const self = this as unknown as Array<{ name: string }>;
        self[0].name = v;
      }

      get greeting() {
        const self = this as unknown as Array<{ name: string }>;
        return `hello ${self[0].name}!`;
      }

      @computed('@each.name')
      get salutation() {
        const self = this as unknown as Array<{ name: string }>;
        return `salutations ${self[0].name}!`;
      }

      @cached
      get helloThere() {
        const self = this as unknown as Array<{ name: string }>;
        return `Well Hello There ${self[0].name}!`;
      }
    }
    // non-decorated fields dont appear on class prototypes as they are instance only
    // @ts-expect-error
    Features.prototype.untrackedField = 'initial untracked value';

    const store = new TestStore();
    store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
      kind: 'array',
      name: 'my-ext',
      features: Features,
    });

    type WithExt<T> = T & {
      sayHello(): string;
      realName: string;
      untrackedField: string;
      trackedField: string;
      readonly greeting: string;
      readonly salutation: string;
      readonly helloThere: string;
    };

    store.schema.registerResources([
      {
        type: 'fragment:nickname',
        identity: null,
        fields: [{ kind: 'field', name: 'name' }],
      },
      withDefaults({
        type: 'user',
        fields: [
          {
            kind: 'schema-array',
            name: 'nicknames',
            type: 'fragment:nickname',
            options: {
              arrayExtensions: ['my-ext'],
            },
          },
        ],
      }),
    ]);
    type User = {
      id: string;
      nicknames: WithExt<Array<{ name: string }>>;
      [Type]: 'user';
    };

    const user1 = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'runspired',
          nicknames: [
            {
              name: 'Chris',
            },
          ],
        },
      },
    });

    // preconditions
    assert.strictEqual(user1.nicknames[0].name, 'Chris');

    // we should not error since in the schema, nor should we have a type error
    assert.strictEqual(user1.nicknames.realName, 'Chris', 'getters with setters work');
    assert.strictEqual(user1.nicknames.sayHello(), 'hello!', 'methods on class prototypes work');
    assert.strictEqual(user1.nicknames.greeting, 'hello Chris!', 'getters on class prototypes work');
    assert.strictEqual(user1.nicknames.salutation, 'salutations Chris!', 'computeds on class prototypes work');
    assert.strictEqual(user1.nicknames.helloThere, 'Well Hello There Chris!', 'cached fields on class prototypes work');

    user1.nicknames[0].name = 'James';

    // precondition, we updated
    assert.strictEqual(user1.nicknames[0].name, 'James');

    // our getters including decorated getters should all update
    assert.strictEqual(user1.nicknames.realName, 'James', 'getters with setters update when underlying value changes');
    assert.strictEqual(
      user1.nicknames.greeting,
      'hello James!',
      'getters on class prototypes update when underlying value changes'
    );
    assert.strictEqual(
      user1.nicknames.salutation,
      DEPRECATE_COMPUTED_CHAINS ? 'salutations James!' : 'salutations Chris!',
      'computeds on class prototypes update when underlying value changes'
    );
    assert.strictEqual(
      user1.nicknames.helloThere,
      'Well Hello There James!',
      'cached fields on class prototypes update when underlying value changes'
    );

    user1.nicknames.realName = 'Chris';

    // our getters including decorated getters should all update
    assert.strictEqual(user1.nicknames[0].name, 'Chris');
    assert.strictEqual(user1.nicknames.realName, 'Chris', 'getters with setters work');
    assert.strictEqual(user1.nicknames.greeting, 'hello Chris!', 'getters on class prototypes work');
    assert.strictEqual(user1.nicknames.salutation, 'salutations Chris!', 'computeds on class prototypes work');
    assert.strictEqual(user1.nicknames.helloThere, 'Well Hello There Chris!', 'cached fields on class prototypes work');

    // check mutable fields
    assert.strictEqual(
      user1.nicknames.trackedField,
      'initial tracked value',
      'decorated value fields with initializers work'
    );
    assert.strictEqual(
      user1.nicknames.untrackedField,
      'initial untracked value',
      'undecorated value fields with initializers work'
    );
    user1.nicknames.trackedField = 'updated value';
    assert.strictEqual(user1.nicknames.trackedField, 'updated value', 'can update mutable-fields');
    user1.nicknames.untrackedField = 'updated value';
    assert.strictEqual(user1.nicknames.untrackedField, 'updated value', 'can update mutable-values');

    user1.nicknames[0] = { name: 'James' };

    // precondition, we updated
    assert.strictEqual(user1.nicknames[0].name, 'James');

    // our getters including decorated getters should all update
    assert.strictEqual(user1.nicknames.realName, 'James', 'getters with setters update when underlying value changes');
    assert.strictEqual(
      user1.nicknames.greeting,
      'hello James!',
      'getters on class prototypes update when underlying value changes'
    );
    assert.strictEqual(
      user1.nicknames.salutation,
      DEPRECATE_COMPUTED_CHAINS ? 'salutations James!' : 'salutations Chris!',
      'computeds on class prototypes update when underlying value changes'
    );
    assert.strictEqual(
      user1.nicknames.helloThere,
      'Well Hello There James!',
      'cached fields on class prototypes update when underlying value changes'
    );
  });
});
