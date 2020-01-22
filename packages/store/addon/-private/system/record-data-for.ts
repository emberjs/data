type RecordData = import('../ts-interfaces/record-data').RecordData;
/*
 * Returns the RecordData instance associated with a given
 * Model or InternalModel.
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
interface InternalModel {
  _recordData: RecordData;
}

type DSModelOrSnapshot = { _internalModel: InternalModel };
type Reference = { internalModel: InternalModel };

type Instance = InternalModel | RecordData | DSModelOrSnapshot | Reference;

export default function recordDataFor(instance: Instance): RecordData;
export default function recordDataFor(instance: object): null;
export default function recordDataFor(instance: Instance | object): RecordData | null {
  let internalModel =
    (instance as DSModelOrSnapshot)._internalModel || (instance as Reference).internalModel || instance;

  return internalModel._recordData || null;
}
