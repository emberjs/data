import ArrayProxy from '@ember/array/proxy';
import ObjectProxy from '@ember/object/proxy';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PromiseArrayProxy<I, T> extends Promise<T> {}
export class PromiseArrayProxy<I, T> extends ArrayProxy<I, T> {
  declare content: T;

  /*
   * If the proxied promise is rejected this will contain the reason
   * provided.
   */
  reason: string | Error;
  /*
   * Once the proxied promise has settled this will become `false`.
   */
  isPending: boolean;
  /*
   * Once the proxied promise has settled this will become `true`.
   */
  isSettled: boolean;
  /*
   * Will become `true` if the proxied promise is rejected.
   */
  isRejected: boolean;
  /*
   * Will become `true` if the proxied promise is fulfilled.
   */
  isFulfilled: boolean;
  /*
   * The promise whose fulfillment value is being proxied by this object.
   */
  promise: Promise<T>;
}

export interface PromiseObjectProxy<T> extends Promise<T> {}
export class PromiseObjectProxy<T> extends ObjectProxy<T> {
  declare content?: T | null;

  /*
   * If the proxied promise is rejected this will contain the reason
   * provided.
   */
  reason: string | Error;
  /*
   * Once the proxied promise has settled this will become `false`.
   */
  isPending: boolean;
  /*
   * Once the proxied promise has settled this will become `true`.
   */
  isSettled: boolean;
  /*
   * Will become `true` if the proxied promise is rejected.
   */
  isRejected: boolean;
  /*
   * Will become `true` if the proxied promise is fulfilled.
   */
  isFulfilled: boolean;
  /*
   * The promise whose fulfillment value is being proxied by this object.
   */
  promise: Promise<T>;
}
