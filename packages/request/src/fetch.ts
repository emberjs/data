/**
 * A basic Fetch Handler which converts a request into a
 * `fetch` call presuming the response to be `json`.
 *
 * ```ts
 * import Fetch from '@ember-data/request/fetch';
 *
 * manager.use([Fetch]);
 * ```
 *
 * @module @ember-data/request/fetch
 * @main @ember-data/request/fetch
 */

import type { Context } from './-private/context';

const _fetch: typeof fetch =
  typeof fetch !== 'undefined'
    ? fetch
    : typeof FastBoot !== 'undefined'
    ? (FastBoot.require('node-fetch') as typeof fetch)
    : ((() => {
        throw new Error('No Fetch Implementation Found');
      }) as typeof fetch);
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
const Fetch = {
  async request(context: Context) {
    const response = await _fetch(context.request.url!, context.request);
    context.setResponse(response);

    if (!response.headers.has('date')) {
      response.headers.set('date', new Date().toUTCString());
    }

    // if we are an error, we will want to throw
    if (!response.ok || response.status >= 400) {
      const text = await response.text();
      let errorPayload: object | undefined;
      try {
        errorPayload = JSON.parse(text) as object;
      } catch {
        // void;
      }
      const error: Error & { content: object | undefined } = new Error(
        `[${response.status}] ${response.statusText} - ${response.url}`
      ) as Error & { content: object | undefined };
      error.content = errorPayload;
      throw error;
    } else {
      return response.json();
    }
  },
};

export default Fetch;
