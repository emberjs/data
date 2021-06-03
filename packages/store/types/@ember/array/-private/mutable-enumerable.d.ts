type Mixin<T> = import('@ember/object/mixin').default<T>;
type Enumerable<T> = import('@ember/array/-private/enumerable').default<T>;

/**
 * This mixin defines the API for modifying generic enumerables. These methods
 * can be applied to an object regardless of whether it is ordered or
 * unordered.
 */
interface MutableEnumerable<T> extends Enumerable<T> {
  /**
   * __Required.__ You must implement this method to apply this mixin.
   */
  addObject(object: T): T;
  /**
   * Adds each object in the passed enumerable to the receiver.
   */
  addObjects(objects: T[] | Enumerable<T>): this;
  /**
   * __Required.__ You must implement this method to apply this mixin.
   */
  removeObject(object: T): T;
  /**
   * Removes each object in the passed enumerable from the receiver.
   */
  removeObjects(objects: T[] | Enumerable<T>): this;
}
declare const MutableEnumerable: Mixin<MutableEnumerable<unknown>>;
export default MutableEnumerable;
