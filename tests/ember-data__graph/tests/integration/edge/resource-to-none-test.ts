import type { Graph } from '@ember-data/graph/-private';
import { graphFor } from '@ember-data/graph/-private';
import Store from '@ember-data/store';
import type { StableExistingRecordIdentifier } from '@warp-drive/core-types/identifier';
import { module, test as _test } from '@warp-drive/diagnostic';
import type { TestContext } from '@warp-drive/diagnostic/ember';
import { registerDerivations, SchemaService, withDefaults } from '@warp-drive/schema-record/schema';

interface LocalTestContext extends TestContext {
  store: TestStore;
  graph: Graph;
  ref(type: string, id: string): StableExistingRecordIdentifier;
  run<T>(callback: () => T): T;
}

type DiagnosticTest = Parameters<typeof _test<LocalTestContext>>[1];
function test(name: string, callback: DiagnosticTest): void {
  return _test<LocalTestContext>(name, callback);
}

class TestStore extends Store {
  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }
}

module<LocalTestContext>('Integration | Graph | Edge > resource-to-none', function (hooks) {
  hooks.beforeEach(function () {
    this.store = new TestStore();
    this.graph = graphFor(this.store._instanceCache._storeWrapper);
    this.ref = (type: string, id: string) =>
      this.store.identifierCache.getOrCreateRecordIdentifier({ type, id }) as StableExistingRecordIdentifier;
    this.run = <T>(callback: () => T): T => {
      let result: T;
      this.store._run(() => {
        result = callback();
      });
      return result!;
    };
  });

  test('we can insert a resource edge and then retrieve it', function (assert) {
    const { store, graph } = this;

    // create a schema for a has-none relationship
    const UserSchema = withDefaults({
      type: 'user',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
        },
      ],
    });
    store.schema.registerResource(UserSchema);

    // generate a few nodes
    const user1 = this.ref('user', '1');
    const user2 = this.ref('user', '2');

    // insert a bestFriend payload
    this.run(() =>
      graph.push({
        op: 'updateRelationship',
        record: user1,
        field: 'bestFriend',
        value: {
          links: {
            related: '/users/1/bestFriend',
            self: '/users/1/relationships/bestFriend',
          },
          meta: {},
          data: user2,
        },
      })
    );

    // retrieve the edge
    const edge = graph.getData(user1, 'bestFriend');

    assert.deepEqual(
      edge,
      {
        links: {
          related: '/users/1/bestFriend',
          self: '/users/1/relationships/bestFriend',
        },
        meta: {},
        data: user2,
      },
      'we can retrieve the edge'
    );
  });
});
