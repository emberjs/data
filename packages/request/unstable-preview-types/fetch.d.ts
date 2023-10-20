import { type Context } from './-private/context';
/**
 * A basic handler which converts a request into a
 * `fetch` call presuming the response to be `json`.
 *
 * ```ts
 * import Fetch from '@ember-data/request/fetch';
 *
 * manager.use([Fetch]);
 * ```
 *
 * @class Fetch
 * @public
 */
declare const Fetch: {
    request(context: Context): Promise<any>;
};
export default Fetch;
//# sourceMappingURL=fetch.d.ts.map