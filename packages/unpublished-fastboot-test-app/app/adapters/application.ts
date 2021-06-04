import RESTAdapter from '@ember-data/adapter/rest';

type SerializerRegistry = import('@ember-data/store/-private/ts-interfaces/registries').SerializerRegistry;

export default class ApplicationAdapter extends RESTAdapter {
  defaultSerializer: keyof SerializerRegistry = 'application';
  namespace = 'api';
}

declare module '@ember-data/store/-private/ts-interfaces/registries' {
  export interface AdapterRegistry {
    application: ApplicationAdapter;
  }
}
