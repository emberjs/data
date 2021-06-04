type JSONAPIAdapter = import('@ember-data/adapter/json-api').default;
type RESTSerializer = import('@ember-data/serializer/rest').default;
type JSONSerializer = import('@ember-data/serializer/json').default;
type JSONAPISerializer = import('@ember-data/serializer/json-api').default;

export interface SerializerRegistry {
  '-rest': RESTSerializer;
  '-json-api': JSONAPISerializer;
  '-default': JSONSerializer;
}
export interface AdapterRegistry {
  '-json-api': JSONAPIAdapter;
}
export interface ModelRegistry {
  '-----______none-do-not-use': undefined; // Typescript needs at least one key for the keyof operator to not return `never` which would make our types difficult to work with.
}

type AppAdapter = AdapterRegistry['application'];
type AppSerializer = SerializerRegistry['application'];

export type ResolvedSerializerRegistry = Omit<
  Record<keyof ModelRegistry | keyof AdapterRegistry, AppSerializer>,
  keyof SerializerRegistry
> &
  SerializerRegistry;
export type ResolvedAdapterRegistry = Omit<
  Record<keyof ResolvedSerializerRegistry, AppAdapter>,
  keyof AdapterRegistry
> &
  AdapterRegistry;
