import type { Graph } from '@ember-data/graph/-private';
import { graphFor } from '@ember-data/graph/-private';
import Store from '@ember-data/store';
import { module, test as _test } from '@warp-drive/diagnostic';
import type { TestContext } from '@warp-drive/diagnostic/ember';
import { registerDerivations, SchemaService, withDefaults } from '@warp-drive/schema-record/schema';

interface LocalTestContext extends TestContext {
  store: TestStore;
  graph: Graph;
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

module<LocalTestContext>('Integration | Graph | Resource > has-none', function (hooks) {
  hooks.beforeEach(function () {
    this.store = new TestStore();
    this.graph = graphFor(this.store._instanceCache._storeWrapper);
  });

  test('Graph.getDefinition works as expected', function (assert) {
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

    // check that we can call getDefinition and get back something meaningful
    const userDefinition = graph.getDefinition({ type: 'user' }, 'bestFriend');
    debugger;
  });
});
