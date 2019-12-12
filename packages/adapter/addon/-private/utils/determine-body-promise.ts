import { warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

import continueOnReject from './continue-on-reject';

interface CustomSyntaxError extends SyntaxError {
  payload?: string | object;
}

type Payload = object | string | undefined;

function checkStatus(response: Response, requestData: JQueryAjaxSettings): boolean {
  const status = response.status;
  return response.ok && (status === 204 || status === 205 || requestData.method === 'HEAD');
}

/*
 * Function that always attempts to parse the response as json, and if an error is thrown,
 * returns `undefined` if the response is successful and has a status code of 204 (No Content),
 * or 205 (Reset Content) or if the request method was 'HEAD', and the plain payload otherwise.
 */
function _determineBodyPromise(
  response: Response,
  requestData: JQueryAjaxSettings,
  payload: Payload
): Promise<Payload> {
  let ret: Payload = payload;

  if (!response.ok) {
    return resolve(payload);
  }

  try {
    ret = JSON.parse(payload as string);
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    (error as CustomSyntaxError).payload = payload;

    if (checkStatus(response, requestData)) {
      ret = undefined;
      return resolve(ret);
    }

    if (DEBUG) {
      let message = `The server returned an empty string for ${requestData.method} ${requestData.url}, which cannot be parsed into a valid JSON. Return either null or {}.`;
      if (payload === '') {
        warn(message, true, {
          id: 'ds.adapter.returned-empty-string-as-JSON',
        });
      }
    }

    // eslint-disable-next-line no-console
    console.warn('This response was unable to be parsed as json.', payload);
    throw error;
  }

  if (checkStatus(response, requestData)) {
    ret = undefined;
  }

  return resolve(ret);
}

// This must remain compatible with ember-fetch
export function determineBodyPromise(
  response: Response,
  requestData: JQueryAjaxSettings
): Promise<Payload> {
  // response.text() may resolve or reject
  // it is a native promise, may not have finally
  return continueOnReject(response.text()).then(payload => _determineBodyPromise(response, requestData, payload));
}
