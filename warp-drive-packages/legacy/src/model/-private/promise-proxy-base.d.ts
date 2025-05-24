import ObjectProxy from '@ember/object/proxy';

export interface PromiseObject<T> extends Promise<T> {}
export class PromiseObject<T> extends ObjectProxy<T> {
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
