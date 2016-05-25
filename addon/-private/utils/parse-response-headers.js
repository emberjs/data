import EmptyObject from 'ember-data/-private/system/empty-object';

const CLRF = '\u000d\u000a';

export default function parseResponseHeaders(headersString) {
  let headers = new EmptyObject();

  if (!headersString) {
    return headers;
  }

  let headerPairs = headersString.split(CLRF);

  headerPairs.forEach((header) => {
    let [field, ...value] = header.split(':');

    field = field.trim();
    value = value.join(':').trim();

    if (value) {
      // according to the spec header fields are case insensitive, that's why
      // we are using the lowercase version here
      //
      // https://tools.ietf.org/html/rfc7230#section-3.2
      let lowerCaseField = field.toLowerCase();
      headers[lowerCaseField] = value;

      // deprecated way since headers are case insensitive; this is kept here
      // for backwards compatibility and should be remove in the next major
      // release of ember-data
      headers[field] = value;
    }
  });

  return headers;
}
