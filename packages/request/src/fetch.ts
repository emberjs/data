/**
 * A very basic Fetch Handler
 *
 * @module @ember-data/request/fetch
 * @main @ember-data/request/fetch
 */

import type { Context } from './-private/context';

/**
 * A basic handler which onverts a request into a
 * `fetch` call presuming the response to be `json`.
 *
 * ```ts
 * import { Fetch } from '@ember-data/request/fetch';
 *
 * manager.use([Fetch]);
 * ```
 *
 * @class Fetch
 * @public
 */
export const Fetch = {
  async request(context: Context) {
    const response = await fetch(context.request.url!, context.request);
    context.setResponse(response);

    return response.json();
  },
};
