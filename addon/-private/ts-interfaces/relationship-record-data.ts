import Relationships from 'ember-data/-private/system/relationships/state/create';
import Relationship from 'ember-data/-private/system/relationships/state/relationship';
import RecordData from './record-data';
import { JsonApiResourceIdentity } from "./record-data-json-api";
import { RecordDataStoreWrapper } from "./record-data-store-wrapper";

export interface RelationshipRecordData extends RecordData {
  //Required by the relationship layer
  isNew(): boolean;
  modelName: string;
  storeWrapper: RecordDataStoreWrapper;
  id: string | null;
  clientId: string | null;
  isEmpty(): boolean;
  getResourceIdentifier(): JsonApiResourceIdentity;
  store: any;
  _relationships: Relationships;
  _implicitRelationships: {
    [key: string]: Relationship;
  };
}