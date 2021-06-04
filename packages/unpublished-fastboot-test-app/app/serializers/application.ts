import JSONSerializer from '@ember-data/serializer/rest';
import { MinimumSerializerInterface } from '@ember-data/store/-private/ts-interfaces/minimum-serializer-interface';

type JsonApiDocument = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').JsonApiDocument;
type ModelSchema = import('@ember-data/store/-private/ts-interfaces/ds-model').ModelSchema;
type CoreStore = import('@ember-data/store/-private/system/core-store').default;
type Snapshot = import('@ember-data/store/-private').Snapshot;
export default class ApplicationSerializer extends JSONSerializer implements MinimumSerializerInterface {
  // TODO these methods are copied over and super to make TS happy.
  // We would not need to do this if JSONSerializer etc. were properly typed and converted to classes
  normalizeResponse(
    store: CoreStore,
    schema: ModelSchema,
    rawPayload: { [key: string]: unknown },
    id: string | null,
    requestType:
      | 'query'
      | 'findRecord'
      | 'queryRecord'
      | 'findAll'
      | 'findBelongsTo'
      | 'findHasMany'
      | 'findMany'
      | 'createRecord'
      | 'deleteRecord'
      | 'updateRecord'
  ): JsonApiDocument {
    return super.normalizeResonse(...arguments);
  }
  serialize(snapshot: Snapshot, options?: { [key: string]: unknown }): { [key: string]: unknown } {
    return super.serialize(...arguments);
  }
}
declare module '@ember-data/store/-private/ts-interfaces/registries' {
  export interface SerializerRegistry {
    application: ApplicationSerializer;
  }
}
