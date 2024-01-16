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
import { getOwnConfig, macroCondition } from '@embroider/macros';

import { cloneResponseProperties, type Context } from './-private/context';

// Lazily close over fetch to avoid breaking Mirage
const _fetch: typeof fetch =
  typeof fetch !== 'undefined'
    ? (...args) => fetch(...args)
    : typeof FastBoot !== 'undefined'
    ? (...args) => (FastBoot.require('node-fetch') as typeof fetch)(...args)
    : ((() => {
        throw new Error('No Fetch Implementation Found');
      }) as typeof fetch);

// clones a response in a way that should still
// allow it to stream
function cloneResponse(response: Response, overrides: Partial<Response>) {
  const props = cloneResponseProperties(response);
  return new Response(response.body, Object.assign(props, overrides));
}

let IS_MAYBE_MIRAGE = () => false;
if (macroCondition(getOwnConfig<{ env: { TESTING: boolean } }>().env.TESTING)) {
  IS_MAYBE_MIRAGE = () =>
    Boolean(typeof window !== 'undefined' && (window as { server?: { pretender: unknown } }).server?.pretender);
}

const MUTATION_OPS = new Set(['updateRecord', 'createRecord', 'deleteRecord']);

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
    let response = await _fetch(context.request.url!, context.request);

    const isError = !response.ok || response.status >= 400;
    const op = context.request.op;
    const isMutationOp = Boolean(op && MUTATION_OPS.has(op));

    if (!isError && !isMutationOp && response.status !== 204 && !response.headers.has('date')) {
      if (IS_MAYBE_MIRAGE()) {
        response.headers.set('date', new Date().toUTCString());
      } else {
        const headers = new Headers(response.headers);
        headers.set('date', new Date().toUTCString());
        response = cloneResponse(response, {
          headers,
        });
      }
    }

    context.setResponse(response);

    // if we are an error, we will want to throw
    if (isError) {
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
      return response.status === 204 ? null : response.json();
    }
  },
};

export default Fetch;
