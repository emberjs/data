import { assert } from '@ember/debug';
import { tracked } from '@glimmer/tracking';
import { resolve } from 'rsvp';

export class WrappedRSVPPromise {
  declare promise: Promise<any> | null;
  declare isDestroyed: boolean;
  declare isDestroying: boolean;

  /**
   * Whether the loading promise is still pending
   *
   * @property {boolean} isPending
   * @public
   */
  @tracked isPending: boolean = false;
  /**
  * Whether the loading promise rejected
  *
  * @property {boolean} isRejected
  * @public
  */
  @tracked isRejected: boolean = false;
  /**
  * Whether the loading promise succeeded
  *
  * @property {boolean} isResolved
  * @public
  */
  @tracked isResolved: boolean = false;

  constructor(promise) {
    this.promise = tapPromise(this, promise);
  }

  /**
   * chain this promise
   *
   * @method then
   * @public
   * @param success
   * @param fail
   * @returns Promise
   */
  then(s, f) {
    return this.promise!.then(s, f);
  }

  /**
   * catch errors thrown by this promise
   * @method catch
   * @public
   * @param callback
   * @returns Promise
   */
  catch(cb) {
    return this.promise!.catch(cb);
  }

  /**
   * run cleanup after this promise completes
   *
   * @method finally
   * @public
   * @param callback
   * @returns Promise
   */
  finally(cb) {
    return this.promise!.finally(cb);
  }
}

function tapPromise(klass, promise) {
  klass.isPending = true;
  klass.isSettled = false;
  klass.isFulfilled = false;
  klass.isRejected = false;
  return resolve(promise).then(
    (content) => {
      klass.isPending = false;
      klass.isFulfilled = true;
      klass.isSettled = true;
      klass.content = content;
      return content;
    },
    (error) => {
      klass.isPending = false;
      klass.isFulfilled = false;
      klass.isRejected = true;
      klass.isSettled = true;
      throw error;
    }
  );
}