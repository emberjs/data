/**
 * <h3 align="center">⚛️ Data utilities for using <em style="color: lightgreen">Warp</em><strong style="color: magenta">Drive</strong> with 🐹 <em style="color: orange">Ember</em><em style="color: lightblue">.js</em></h3>
 *
 * ## Installation
 *
 * ```cli
 * pnpm install @warp-drive/ember
 * ```
 *
 * ## About
 *
 * This library provides reactive utilities for working with promises
 * and requests, building over these primitives to provide functions
 * and components that enable you to build robust performant apps with
 * elegant control flow.
 *
 * ## Using .hbs
 *
 * The components and utils this library exports are intended for use with Glimmer
 * Flavored JavaScript (gjs). To use them in handlebars files, your app should re-
 * export them. For instance:
 *
 * *app/components/await.ts*
 * ```ts
 * export { Await as default } from '@warp-drive/ember';
 * ```
 *
 * ```hbs
 * <Await @promise={{this.getTheData}}></Await>
 * ```
 *
 * This allows renaming them to avoid conflicts just by using a different filename
 * if desired:
 *
 * *app/components/warp-drive-await.ts*
 * ```ts
 * export { Await as default } from '@warp-drive/ember';
 * ```
 *
 * ```hbs
 * <WarpDriveAwait @promise={{this.getTheData}}></WarpDriveAwait>
 * ```
 *
 * @module
 */
export { Request } from './-private/request.gts';
export { Await, Throw } from './-private/await.gts';

/**
 * PromiseState provides a reactive wrapper for a promise which allows you write declarative
 * code around a promise's control flow. It is useful in both Template and JavaScript contexts,
 * allowing you to quickly derive behaviors and data from pending, error and success states.
 *
 * ```ts
 * interface PromiseState<T = unknown, E = unknown> {
 *   isPending: boolean;
 *   isSuccess: boolean;
 *   isError: boolean;
 *   result: T | null;
 *   error: E | null;
 * }
 * ```
 *
 * To get the state of a promise, use `getPromiseState`.
 *
 * @class PromiseState
 * @public
 */

/**
 * Returns a reactive state-machine for the provided promise or awaitable.
 *
 * Repeat calls to `getPromiseState` with the same promise will return the same state object
 * making is safe and easy to use in templates and JavaScript code to produce reactive
 * behaviors around promises.
 *
 * `getPromiseState` can be used in both JavaScript and Template contexts.
 *
 * ```ts
 * import { getPromiseState } from '@warp-drive/ember';
 *
 * const state = getPromiseState(promise);
 * ```
 *
 * For instance, we could write a getter on a component that updates whenever
 * the promise state advances or the promise changes, by combining the function
 * with the use of `@cached`
 *
 * ```ts
 * class Component {
 *   @cached
 *   get title() {
 *     const state = getPromiseState(this.args.request);
 *     if (state.isPending) {
 *       return 'loading...';
 *     }
 *     if (state.isError) { return null; }
 *     return state.result.title;
 *   }
 * }
 * ```
 *
 * Or in a template as a helper:
 *
 * ```gjs
 * import { getPromiseState } from '@warp-drive/ember';
 *
 * <template>
 *   {{#let (getPromiseState @request) as |state|}}
 *     {{#if state.isPending}} <Spinner />
 *     {{else if state.isError}} <ErrorForm @error={{state.error}} />
 *     {{else}}
 *       <h1>{{state.result.title}}</h1>
 *     {{/if}}
 *   {{/let}}
 * </template>
 * ```
 *
 * If looking to use in a template, consider also the `<Await />` component.

 * @public
 * @param {Promise<T> | Awaitable<T, E>} promise
 * @return {PromiseState<T, E>}
 */
export { getPromiseState } from '@warp-drive/core/store/-private';

/**
 * Lazily consumes the stream of a request, providing a number of
 * reactive properties that can be used to build UIs that respond
 * to the progress of a request.
 *
 * @class RequestLoadingState
 * @public
 */

/**
 * RequestState extends the concept of PromiseState to provide a reactive
 * wrapper for a request `Future` which allows you write declarative code
 * around a Future's control flow.
 *
 * It is useful in both Template and JavaScript contexts, allowing you
 * to quickly derive behaviors and data from pending, error and success
 * states.
 *
 * The key difference between a Promise and a Future is that Futures provide
 * access to a stream of their content, the identity of the request (if any)
 * as well as the ability to attempt to abort the request.
 *
 * ```ts
 * interface Future<T> extends Promise<T>> {
 *   getStream(): Promise<ReadableStream>;
 *   abort(): void;
 *   lid: StableDocumentIdentifier | null;
 * }
 * ```
 *
 * These additional APIs allow us to craft even richer state experiences.
 *
 * To get the state of a request, use `getRequestState`.
 *
 * @class RequestState
 * @public
 */

/**
 *
 *
 * `getRequestState` can be used in both JavaScript and Template contexts.
 *
 * ```ts
 * import { getRequestState } from '@warp-drive/ember';
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
 * Or in a template as a helper:
 *
 * ```gjs
 * import { getRequestState } from '@warp-drive/ember';
 *
 * <template>
 *   {{#let (getRequestState @request) as |state|}}
 *     {{#if state.isPending}}
 *       <Spinner />
 *     {{else if state.isError}}
 *       <ErrorForm @error={{state.error}} />
 *     {{else}}
 *       <h1>{{state.result.title}}</h1>
 *     {{/if}}
 *   {{/let}}
 * </template>
 * ```
 *
 * If looking to use in a template, consider also the `<Request />` component
 * which offers a numbe of additional capabilities for requests *beyond* what
 * `RequestState` provides.
 *
 * @public
 * @param future
 * @return {RequestState}
 */
export { getRequestState, type RequestLoadingState } from '@warp-drive/core/store/-private';

export { Paginate } from './-private/paginate.gts';
export { getPaginationState } from '@warp-drive/core/store/-private';
