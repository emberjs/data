/*
 * Function that always attempts to parse the response as json, and if an error is thrown,
 * returns `undefined` if the response is successful and has a status code of 204 (No Content),
 * or 205 (Reset Content) or if the request method was 'HEAD', and the plain payload otherwise.
 */
export function determineBodyPromise(
  response: Response,
  requestData: JQueryAjaxSettings
): Promise<object | string | undefined> {
  return response.text().then(function(payload) {
    let ret: string | object | undefined = payload;
    try {
      ret = JSON.parse(payload);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      const status = response.status;
      if (
        response.ok &&
        (status === 204 || status === 205 || requestData.method === 'HEAD')
      ) {
        ret = undefined;
      } else {
        console.warn('This response was unable to be parsed as json.', payload);
      }
    }
    return ret;
  });
}
