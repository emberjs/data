import { StableRecordIdentifier, IS_IDENTIFIER } from '../ts-interfaces/identifier';

/**
  @module @ember-data/store
*/

export default function isStableIdentifier(identifier: any): identifier is StableRecordIdentifier {
  return identifier[IS_IDENTIFIER] === true;
}
