import Store from '../../store';
import { RecordIdentifier } from '../../cache/record-identifier';
import { Relationship } from './relationship';

type Dict<K extends string, V> = { [KK in K]: V };

const IDENTIFIER_MAP = new WeakMap<RecordIdentifier, Dict<string, Relationship>>();

/**
 * @method relationshipStateFor
 *
 * @param {Store} store - an instance of an `ember-data` store service
 * @param {RecordIdentifier} identifier - an instance of RecordIdentifier acting as a pointer to some data
 * @param {string} propertyName - the property of the relationship on the Model
 *
 * @returns {Relationship} - a state bucket for the associated relationship
 */
export default function relationshipStateFor(
  store: Store,
  identifier: RecordIdentifier,
  propertyName: string
): Relationship {
  let propertyMap: Dict<string, Relationship> = IDENTIFIER_MAP.get(identifier);

  if (propertyMap === undefined) {
    propertyMap = Object.create(null);
    IDENTIFIER_MAP.set(identifier, propertyMap);
  }

  let definition = store._relationshipsDefinitionFor(identifier.type)[propertyName];

  return (propertyMap[propertyName] =
    propertyMap[propertyName] ||
    new Relationship({
      definition,
      identifier,
      propertyName,
      store,
    }));
}
