/**
 *
 *
 * `getRequestState` gets the state of a promise, even if resolved.
 * When already resolved, the state is correct immediately. no awaiting will be done.
 *
 * ```ts
 * import { getRequestState } from '@warp-drive/tc39-proposal-signals';
 *
 * const state = getRequestState(future);
 * ```
 *
 * For instance, we could write a getter on a component that updates whenever
 * the request state advances or the future changes, by combining the function
 * with the use of `@cached`
 *
 * ```ts
 * class Component {
 *   @cached
 *   get title() {
 *     const state = getRequestState(this.args.request);
 *     if (state.isPending) {
 *       return 'loading...';
 *     }
 *     if (state.isError) { return null; }
 *     return state.result.title;
 *   }
 * }
 * ```
 *
 * @public
 * @param future
 * @return {RequestState}
 */
export { getRequestState, type RequestLoadingState } from '@warp-drive/core/store/-private';
