import type { Graph } from '@ember-data/graph/-private';
import { graphFor } from '@ember-data/graph/-private';
import type { EdgeDefinition } from '@ember-data/graph/-private/-edge-definition';
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

module<LocalTestContext>('Integration | Graph | Schema > resource-to-none', function (hooks) {
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
    const implicitKey = userDefinition?.inverseKey;
    assert.true(implicitKey?.startsWith('implicit-user:bestFriend'), 'implicit key is generated correctly');
    assert.notEqual(implicitKey, 'implicit-user:bestFriend', 'implicit key is not just the prefix');

    const expected = {
      kind: 'resource',
      key: 'bestFriend',
      type: 'user',
      isAsync: false,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: false,
      isPaginated: false,
      inverseKey: implicitKey,
      inverseType: 'user',
      inverseIsAsync: false,
      inverseIsImplicit: true,
      inverseIsCollection: true,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'implicit',
      inverseIsPolymorphic: false,
    };

    assert.deepEqual(userDefinition, expected, 'getDefinition returns the expected definition');

    const actualEdge = graph._definitionCache.user?.bestFriend;
    const expectedEdge: EdgeDefinition = {
      lhs_key: 'user:bestFriend',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'bestFriend',
      lhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: false,
        isPaginated: false,
        inverseKey: implicitKey,
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: true,
        inverseIsCollection: true,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'implicit',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: false,
      rhs_key: implicitKey,
      rhs_modelNames: ['user'],
      rhs_baseModelName: 'user',
      rhs_relationshipName: implicitKey,
      rhs_definition: {
        kind: 'implicit',
        key: implicitKey,
        type: 'user',
        isAsync: false,
        isImplicit: true,
        isCollection: true,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: false,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: false,
      isSelfReferential: true,
      isReflexive: false,
    };

    assert.deepEqual(actualEdge, expectedEdge, 'edge is created correctly');
  });

  test('Graph.getDefinition works as expected with explicit inverse: null', function (assert) {
    const { store, graph } = this;

    // create a schema for a has-none relationship
    const UserSchema = withDefaults({
      type: 'user',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
          options: {
            inverse: null,
          },
        },
      ],
    });
    store.schema.registerResource(UserSchema);

    // check that we can call getDefinition and get back something meaningful
    const userDefinition = graph.getDefinition({ type: 'user' }, 'bestFriend');
    const implicitKey = userDefinition?.inverseKey;
    assert.true(implicitKey?.startsWith('implicit-user:bestFriend'), 'implicit key is generated correctly');
    assert.notEqual(implicitKey, 'implicit-user:bestFriend', 'implicit key is not just the prefix');

    const expected = {
      kind: 'resource',
      key: 'bestFriend',
      type: 'user',
      isAsync: false,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: false,
      isPaginated: false,
      inverseKey: implicitKey,
      inverseType: 'user',
      inverseIsAsync: false,
      inverseIsImplicit: true,
      inverseIsCollection: true,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'implicit',
      inverseIsPolymorphic: false,
    };

    assert.deepEqual(userDefinition, expected, 'getDefinition returns the expected definition');

    const actualEdge = graph._definitionCache.user?.bestFriend;
    const expectedEdge: EdgeDefinition = {
      lhs_key: 'user:bestFriend',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'bestFriend',
      lhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: false,
        isPaginated: false,
        inverseKey: implicitKey,
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: true,
        inverseIsCollection: true,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'implicit',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: false,
      rhs_key: implicitKey,
      rhs_modelNames: ['user'],
      rhs_baseModelName: 'user',
      rhs_relationshipName: implicitKey,
      rhs_definition: {
        kind: 'implicit',
        key: implicitKey,
        type: 'user',
        isAsync: false,
        isImplicit: true,
        isCollection: true,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: false,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: false,
      isSelfReferential: true,
      isReflexive: false,
    };

    assert.deepEqual(actualEdge, expectedEdge, 'edge is created correctly');
  });

  test('Graph.getDefinition works as expected with async: true', function (assert) {
    const { store, graph } = this;

    // create a schema for a has-none relationship
    const UserSchema = withDefaults({
      type: 'user',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
          options: { async: true },
        },
      ],
    });
    store.schema.registerResource(UserSchema);

    // check that we can call getDefinition and get back something meaningful
    const userDefinition = graph.getDefinition({ type: 'user' }, 'bestFriend');
    const implicitKey = userDefinition?.inverseKey;
    assert.true(implicitKey?.startsWith('implicit-user:bestFriend'), 'implicit key is generated correctly');
    assert.notEqual(implicitKey, 'implicit-user:bestFriend', 'implicit key is not just the prefix');

    const expected = {
      kind: 'resource',
      key: 'bestFriend',
      type: 'user',
      isAsync: true,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: false,
      isPaginated: false,
      inverseKey: implicitKey,
      inverseType: 'user',
      inverseIsAsync: false,
      inverseIsImplicit: true,
      inverseIsCollection: true,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'implicit',
      inverseIsPolymorphic: false,
    };

    assert.deepEqual(userDefinition, expected, 'getDefinition returns the expected definition');

    const actualEdge = graph._definitionCache.user?.bestFriend;
    const expectedEdge: EdgeDefinition = {
      lhs_key: 'user:bestFriend',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'bestFriend',
      lhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: true,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: false,
        isPaginated: false,
        inverseKey: implicitKey,
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: true,
        inverseIsCollection: true,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'implicit',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: false,
      rhs_key: implicitKey,
      rhs_modelNames: ['user'],
      rhs_baseModelName: 'user',
      rhs_relationshipName: implicitKey,
      rhs_definition: {
        kind: 'implicit',
        key: implicitKey,
        type: 'user',
        isAsync: false,
        isImplicit: true,
        isCollection: true,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: true,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: false,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: false,
      isSelfReferential: true,
      isReflexive: false,
    };

    assert.deepEqual(actualEdge, expectedEdge, 'edge is created correctly');
  });

  test('Graph.getDefinition works as expected with polymorphics', function (assert) {
    const { store, graph } = this;

    // create a schema for a has-none relationship
    const UserSchema = withDefaults({
      type: 'user',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
          options: {
            polymorphic: true,
          },
        },
      ],
    });
    store.schema.registerResource(UserSchema);

    // check that we can call getDefinition and get back something meaningful
    const userDefinition = graph.getDefinition({ type: 'user' }, 'bestFriend');
    const implicitKey = userDefinition?.inverseKey;
    assert.true(implicitKey?.startsWith('implicit-user:bestFriend'), 'implicit key is generated correctly');
    assert.notEqual(implicitKey, 'implicit-user:bestFriend', 'implicit key is not just the prefix');

    const expected = {
      kind: 'resource',
      key: 'bestFriend',
      type: 'user',
      isAsync: false,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: true,
      isPaginated: false,
      inverseKey: implicitKey,
      inverseType: 'user',
      inverseIsAsync: false,
      inverseIsImplicit: true,
      inverseIsCollection: true,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'implicit',
      inverseIsPolymorphic: false,
    };

    assert.deepEqual(userDefinition, expected, 'getDefinition returns the expected definition');

    const actualEdge = graph._definitionCache.user?.bestFriend;
    const expectedEdge: EdgeDefinition = {
      lhs_key: 'user:bestFriend',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'bestFriend',
      lhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: true,
        isPaginated: false,
        inverseKey: implicitKey,
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: true,
        inverseIsCollection: true,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'implicit',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: true,
      rhs_key: implicitKey,
      rhs_modelNames: ['user'],
      rhs_baseModelName: 'user',
      rhs_relationshipName: implicitKey,
      rhs_definition: {
        kind: 'implicit',
        key: implicitKey,
        type: 'user',
        isAsync: false,
        isImplicit: true,
        isCollection: true,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: true,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: false,
      isSelfReferential: true,
      isReflexive: false,
    };

    assert.deepEqual(actualEdge, expectedEdge, 'edge is created correctly');
  });
});
