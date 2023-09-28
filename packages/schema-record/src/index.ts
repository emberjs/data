type Store = { peekRecord(identifier: StableRecordIdentifier): SchemaModel | unknown | null };
type StableRecordIdentifier = { lid: string };

export default class SchemaModel {
  constructor(store: Store, identifier: StableRecordIdentifier) {}
}
