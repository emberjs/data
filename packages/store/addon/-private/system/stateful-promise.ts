import { tracked } from '@glimmer/tracking';

import { resolve } from 'rsvp';

export class StatefulPromise {
  declare promise: Promise<unknown> | null;
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

  constructor(promise: Promise<unknown>) {
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
  then(success: (value: unknown) => unknown, failure: (reason: unknown) => PromiseLike<never>) {
    return this.promise!.then(success, failure);
  }

  /**
   * catch errors thrown by this promise
   * @method catch
   * @public
   * @param callback
   * @returns Promise
   */
  catch(cb: (reason: unknown) => PromiseLike<never>) {
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
  finally(cb: () => void) {
    return this.promise!.finally(cb);
  }
}

function tapPromise(klass: StatefulPromise, promise: Promise<unknown>) {
  klass.isPending = true;
  klass.isResolved = false;
  klass.isRejected = false;
  return resolve(promise).then(
    (content: unknown) => {
      klass.isPending = false;
      klass.isResolved = true;
      return content;
    },
    (error: Error | unknown) => {
      klass.isPending = false;
      klass.isResolved = false;
      klass.isRejected = true;
      throw error;
    }
  );
}
