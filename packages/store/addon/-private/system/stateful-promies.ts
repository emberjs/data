import { assert } from '@ember/debug';
import { tracked } from '@glimmer/tracking';
import { resolve } from 'rsvp';

export class WrappedRSVPPromise {
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
    this.promise = promise;
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
  then() {
    return this.promise.then()
  }
}