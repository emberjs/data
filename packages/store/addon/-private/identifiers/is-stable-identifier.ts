import { StableRecordIdentifier, IS_IDENTIFIER } from '../ts-interfaces/identifier';

export default function isStableIdentifier(identifier: any): identifier is StableRecordIdentifier {
  return identifier[IS_IDENTIFIER] === true;
}
