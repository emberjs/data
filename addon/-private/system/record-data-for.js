/**
 * Returns the RecordData instance associated with a given
 * DS.Model or InternalModel.
 *
 * Intentionally "loose" to allow anything with an _internalModel
 * property until InternalModel is eliminated.
 *
 * Intentionally not typed to `InternalModel` due to circular dependency
 *  which that creates.
 *
 * Overtime, this should shift to a "weakmap" based lookup in the
 *  "Ember.getOwner(obj)" style.
 */
export default function recordDataFor(instance) {
  let internalModel = instance._internalModel || instance.internalModel || instance;

  return internalModel._recordData || null;
}

export function relationshipsFor(instance) {
  let recordData = recordDataFor(instance) || instance;

  return recordData._relationships;
}

export function relationshipStateFor(instance, propertyName) {
  return relationshipsFor(instance).get(propertyName);
}
