import RSVP from 'rsvp';

/**
 * A low level mixin making ObjectProxy promise-aware.
 */
interface PromiseProxyMixin<T> extends RSVP.Promise<T> {
  /**
   * If the proxied promise is rejected this will contain the reason
   * provided.
   */
  reason?: Error | string;
  /**
   * Once the proxied promise has settled this will become `false`.
   */
  isPending: boolean;
  /**
   * Once the proxied promise has settled this will become `true`.
   */
  isSettled: boolean;
  /**
   * Will become `true` if the proxied promise is rejected.
   */
  isRejected: boolean;
  /**
   * Will become `true` if the proxied promise is fulfilled.
   */
  isFulfilled: boolean;
  /**
   * The promise whose fulfillment value is being proxied by this object.
   */
  promise: RSVP.Promise<T>;
}
declare class PromiseProxyMixin<T> extends RSVP.Promise<T> {}
export default PromiseProxyMixin;
