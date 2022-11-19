/**
 * @module @ember-data/request/fetch
 */
import type { RequestContext } from './index';

/**
 * A basic handler which onverts a request into a
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
export default {
  async request(context: RequestContext) {
    const response = await fetch(context.request.url, context.request);
    context.setResponse(response);

    return response.json();
  },
};
