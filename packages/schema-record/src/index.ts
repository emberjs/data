import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

export default class SchemaModel {
  constructor(store: Store, identifier: StableRecordIdentifier) {}
}
