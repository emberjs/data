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

module<LocalTestContext>('Integration | Graph | Schema | resource-to-one', function (hooks) {
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
          name: 'favoritePet',
          kind: 'resource',
          type: 'pet',
          options: { inverse: 'bestFriend' },
        },
      ],
    });
    const PetSchema = withDefaults({
      type: 'pet',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
          options: { inverse: 'favoritePet' },
        },
      ],
    });
    store.schema.registerResources([PetSchema, UserSchema]);

    // check that we can call getDefinition and get back something meaningful
    const userDefinition = graph.getDefinition({ type: 'user' }, 'favoritePet');

    const expected = {
      kind: 'resource',
      key: 'favoritePet',
      type: 'pet',
      isAsync: false,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: false,
      isPaginated: false,
      inverseKey: 'bestFriend',
      inverseType: 'user',
      inverseIsAsync: false,
      inverseIsImplicit: false,
      inverseIsCollection: false,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'resource',
      inverseIsPolymorphic: false,
    };

    assert.deepEqual(userDefinition, expected, 'getDefinition returns the expected definition');

    const actualEdge = graph._definitionCache.user?.favoritePet;
    const expectedEdge: EdgeDefinition = {
      lhs_key: 'user:favoritePet',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'favoritePet',
      lhs_definition: {
        kind: 'resource',
        key: 'favoritePet',
        type: 'pet',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: false,
        isPaginated: false,
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: false,
      rhs_key: 'pet:bestFriend',
      rhs_modelNames: ['pet'],
      rhs_baseModelName: 'pet',
      rhs_relationshipName: 'bestFriend',
      rhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'favoritePet',
        inverseType: 'pet',
        inverseIsAsync: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: false,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: true,
      isSelfReferential: false,
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
          name: 'favoritePet',
          kind: 'resource',
          type: 'pet',
          options: { inverse: 'bestFriend', async: true },
        },
      ],
    });
    const PetSchema = withDefaults({
      type: 'pet',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
          options: { inverse: 'favoritePet' },
        },
      ],
    });
    store.schema.registerResources([PetSchema, UserSchema]);

    // check that we can call getDefinition and get back something meaningful
    const userDefinition = graph.getDefinition({ type: 'user' }, 'favoritePet');

    const expected = {
      kind: 'resource',
      key: 'favoritePet',
      type: 'pet',
      isAsync: true,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: false,
      isPaginated: false,
      inverseKey: 'bestFriend',
      inverseType: 'user',
      inverseIsAsync: false,
      inverseIsImplicit: false,
      inverseIsCollection: false,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'resource',
      inverseIsPolymorphic: false,
    };

    assert.deepEqual(userDefinition, expected, 'getDefinition returns the expected definition');

    const actualEdge = graph._definitionCache.user?.favoritePet;
    const expectedEdge: EdgeDefinition = {
      lhs_key: 'user:favoritePet',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'favoritePet',
      lhs_definition: {
        kind: 'resource',
        key: 'favoritePet',
        type: 'pet',
        isAsync: true,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: false,
        isPaginated: false,
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: false,
      rhs_key: 'pet:bestFriend',
      rhs_modelNames: ['pet'],
      rhs_baseModelName: 'pet',
      rhs_relationshipName: 'bestFriend',
      rhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'favoritePet',
        inverseType: 'pet',
        inverseIsAsync: true,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: false,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: true,
      isSelfReferential: false,
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
          name: 'favoritePet',
          kind: 'resource',
          type: 'pet',
          options: { inverse: 'bestFriend', polymorphic: true },
        },
      ],
    });
    const PetSchema = withDefaults({
      type: 'pet',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
          options: { as: 'pet', inverse: 'favoritePet' },
        },
      ],
    });
    const DogSchema = withDefaults({
      type: 'dog',
      fields: [
        {
          name: 'bestFriend',
          kind: 'resource',
          type: 'user',
          options: { as: 'pet', inverse: 'favoritePet' },
        },
      ],
    });
    store.schema.registerResources([PetSchema, DogSchema, UserSchema]);

    // check that we can call getDefinition and get back something meaningful
    const userDefinition = graph.getDefinition({ type: 'user' }, 'favoritePet');

    const expected = {
      kind: 'resource',
      key: 'favoritePet',
      type: 'pet',
      isAsync: false,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: true,
      isPaginated: false,
      inverseKey: 'bestFriend',
      inverseType: 'user',
      inverseIsAsync: false,
      inverseIsImplicit: false,
      inverseIsCollection: false,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'resource',
      inverseIsPolymorphic: false,
    };

    assert.deepEqual(userDefinition, expected, 'getDefinition returns the expected definition');

    const actualEdge = graph._definitionCache.user?.favoritePet;
    const expectedEdge: EdgeDefinition = {
      lhs_key: 'user:favoritePet',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'favoritePet',
      lhs_definition: {
        kind: 'resource',
        key: 'favoritePet',
        type: 'pet',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: true,
        isPaginated: false,
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: true,
      rhs_key: 'pet:bestFriend',
      rhs_modelNames: ['pet'],
      rhs_baseModelName: 'pet',
      rhs_relationshipName: 'bestFriend',
      rhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'favoritePet',
        inverseType: 'pet',
        inverseIsAsync: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: true,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: true,
      isSelfReferential: false,
      isReflexive: false,
    };

    assert.deepEqual(actualEdge, expectedEdge, 'edge is created correctly');

    //////////////////////////////////////////
    // now get dog definition to fill out the polymorphic side
    //////////////////////////////////////////

    // check that we can call getDefinition and get back something meaningful
    const dogDefinition = graph.getDefinition({ type: 'dog' }, 'bestFriend');

    const finalExpected = {
      kind: 'resource',
      key: 'bestFriend',
      type: 'user',
      isAsync: false,
      isImplicit: false,
      isCollection: false,
      isPolymorphic: false,
      isPaginated: false,
      inverseKey: 'favoritePet',
      inverseType: 'pet',
      inverseIsAsync: false,
      inverseIsImplicit: false,
      inverseIsCollection: false,
      inverseIsPaginated: false,
      resetOnRemoteUpdate: false,
      inverseKind: 'resource',
      inverseIsPolymorphic: true,
    };

    assert.deepEqual(dogDefinition, finalExpected, 'getDefinition returns the expected definition');

    const finalActualEdge = graph._definitionCache.user?.favoritePet;
    const finalExpectedEdge: EdgeDefinition = {
      lhs_key: 'user:favoritePet',
      lhs_modelNames: ['user'],
      lhs_baseModelName: 'user',
      lhs_relationshipName: 'favoritePet',
      lhs_definition: {
        kind: 'resource',
        key: 'favoritePet',
        type: 'pet',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPolymorphic: true,
        isPaginated: false,
        inverseKey: 'bestFriend',
        inverseType: 'user',
        inverseIsAsync: false,
        inverseIsImplicit: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseIsPolymorphic: false,
      },
      lhs_isPolymorphic: true,
      rhs_key: 'pet:bestFriend',
      rhs_modelNames: ['pet', 'dog'],
      rhs_baseModelName: 'pet',
      rhs_relationshipName: 'bestFriend',
      rhs_definition: {
        kind: 'resource',
        key: 'bestFriend',
        type: 'user',
        isAsync: false,
        isImplicit: false,
        isCollection: false,
        isPaginated: false,
        isPolymorphic: false,
        resetOnRemoteUpdate: false,
        inverseKind: 'resource',
        inverseKey: 'favoritePet',
        inverseType: 'pet',
        inverseIsAsync: false,
        inverseIsCollection: false,
        inverseIsPaginated: false,
        inverseIsPolymorphic: true,
        inverseIsImplicit: false,
      },
      rhs_isPolymorphic: false,
      hasInverse: true,
      isSelfReferential: false,
      isReflexive: false,
    };

    assert.deepEqual(finalActualEdge, finalExpectedEdge, 'edge is created correctly');
  });
});
