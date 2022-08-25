import type Enumerable from '@ember/array/-private/enumerable';
import type Mixin from '@ember/object/mixin';

/**
 * This mixin defines the API for modifying generic enumerables. These methods
 * can be applied to an object regardless of whether it is ordered or
 * unordered.
 */
interface MutableEnumerable<T> extends Enumerable<T> {
  /**
   * __Required.__ You must implement this method to apply this mixin.
   */
  addObject(object: T): this;
  /**
   * Adds each object in the passed enumerable to the receiver.
   */
  addObjects(objects: T[] | Enumerable<T>): this;
  /**
   * __Required.__ You must implement this method to apply this mixin.
   */
  removeObject(object: T): this;
  /**
   * Removes each object in the passed enumerable from the receiver.
   */
  removeObjects(objects: T[] | Enumerable<T>): this;
}
declare const MutableEnumerable: Mixin<MutableEnumerable<unknown>>;
export default MutableEnumerable;
