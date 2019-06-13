import memberPresent from "../utils/member-present";

/**
 * MUST be an array of error-objects
 *
 *  See: http://jsonapi.org/format/#error-objects
 *
 * @param validator
 * @param document
 * @param errors
 * @param path
 * @returns {boolean}
 */
export default function validateErrors({ /*validator,*/ document, /*errors,*//*path*/ }) {
  if (memberPresent(document, "errors")) {
    return !Array.isArray(document.errors);
  }

  return true;
}
