import Relationships from '../system/relationships/state/create';
import Relationship from '../system/relationships/state/relationship';
import RecordData from './record-data';
import { JsonApiResourceIdentity } from './record-data-json-api';

/**
  @module @ember-data/store
*/

// we import the class not the interface because we expect
// because we expect to use this internally with the more complete set
// of APIs
import { RecordDataStoreWrapper } from './record-data-store-wrapper';

export interface RelationshipRecordData extends RecordData {
  //Required by the relationship layer
  isNew(): boolean;
  modelName: string;
  storeWrapper: RecordDataStoreWrapper;
  id: string | null;
  clientId: string | null;
  isEmpty(): boolean;
  getResourceIdentifier(): JsonApiResourceIdentity;
  _relationships: Relationships;
  _implicitRelationships: {
    [key: string]: Relationship;
  };
}
