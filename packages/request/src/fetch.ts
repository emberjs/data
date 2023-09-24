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
import { cloneResponseProperties, type Context } from './-private/context';

const _fetch: typeof fetch =
  typeof fetch !== 'undefined'
    ? fetch
    // @ts-expect-error FastBoot is untyped
    : typeof FastBoot !== 'undefined'
    // @ts-expect-error FastBoot is untyped
    ? (FastBoot.require('node-fetch') as typeof fetch)
    : ((() => {
        throw new Error('No Fetch Implementation Found');
      }) as typeof fetch);

// clones a response in a way that should still
// allow it to stream
function cloneResponse(response: Response, overrides: Partial<Response>) {
  const props = cloneResponseProperties(response);
  return new Response(response.body, Object.assign(props, overrides));
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
      const headers = new Headers(response.headers);
      headers.set('date', new Date().toUTCString());
      response = cloneResponse(response, { headers });
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
