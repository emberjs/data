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
 * @module @warp-drive/ember
 * @main @warp-drive/ember
 */
export { getRequestState } from './-private/request-state';
export { getPromiseState } from './-private/promise-state';
export { Request } from './-private/request.gts';
export { Await, Throw } from './-private/await.gts';
