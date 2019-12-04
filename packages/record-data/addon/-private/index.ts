// exported for use in the store when needed
export { default as RecordData } from './record-data';

// re-exported for ember-data
export { default as Relationship } from './relationships/state/relationship';

// only exported for Tests
export { relationshipStateFor, relationshipsFor } from './record-data-for';
