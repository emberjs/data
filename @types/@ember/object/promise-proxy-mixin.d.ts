/**
 * A low level mixin making ObjectProxy promise-aware.
 */
interface PromiseProxyMixin<T> extends Promise<T> {
  /**
   * If the proxied promise is rejected this will contain the reason
   * provided.
   */
  reason: string | Error;
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
  promise: Promise<T>;
}
declare class PromiseProxyMixin<T> extends Promise<T> {}
export default PromiseProxyMixin;
