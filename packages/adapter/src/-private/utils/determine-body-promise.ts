import { warn } from '@ember/debug';

import { DEBUG } from '@warp-drive/build-config/env';

import type { RequestData } from '../../rest';
import continueOnReject from './continue-on-reject';

type Payload = Error | Record<string, unknown> | unknown[] | string | undefined;

interface CustomSyntaxError extends SyntaxError {
  payload: Payload;
}

/*
 * Function that always attempts to parse the response as json, and if an error is thrown,
 * returns `undefined` if the response is successful and has a status code of 204 (No Content),
 * or 205 (Reset Content) or if the request method was 'HEAD', and the plain payload otherwise.
 */
function _determineContent(response: Response, requestData: JQueryAjaxSettings, payload: Payload): Payload {
  let ret: Payload = payload;
  let error: Error | null = null;

  if (!response.ok) {
    return payload;
  }

  const status = response.status;
  const payloadIsEmpty = payload === '' || payload === null;
  const statusIndicatesEmptyResponse = status === 204 || status === 205 || requestData.method === 'HEAD';

  if (DEBUG) {
    if (payloadIsEmpty && !statusIndicatesEmptyResponse) {
      const message = `The server returned an empty string for ${requestData.method} ${requestData.url}, which cannot be parsed into a valid JSON. Return either null or {}.`;
      if (payload === '') {
        warn(message, {
          id: 'ds.adapter.returned-empty-string-as-JSON',
        });
      }
    }
  }

  if (response.ok && (statusIndicatesEmptyResponse || payloadIsEmpty)) {
    return;
  }

  try {
    ret = JSON.parse(payload as string) as Payload;
  } catch (e) {
    if (!(e instanceof SyntaxError)) {
      return e as Error;
    }
    (e as CustomSyntaxError).payload = payload;
    error = e;
  }

  if (error) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('This response was unable to be parsed as json.', payload);
    }
    return error;
  }

  return ret;
}

export function determineBodyPromise(response: Response, requestData: RequestData): Promise<Payload> {
  // response.text() may resolve or reject
  // it is a native promise, may not have finally
  return continueOnReject(response.text()).then((payload) => _determineContent(response, requestData, payload));
}
