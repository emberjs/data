const CLRF = '\u000d\u000a';

export default function parseResponseHeaders(headersString) {
  let headers = Object.create(null);

  if (!headersString) {
    return headers;
  }

  let headerPairs = headersString.split(CLRF);
  for (let i = 0; i < headerPairs.length; i++) {
    let header = headerPairs[i];
    let j = 0;
    let foundSep = false;

    for (; j < header.length; j++) {
      if (header.charCodeAt(j) === 58 /* ':' */) {
        foundSep = true;
        break;
      }
    }

    if (foundSep === false) {
      continue;
    }

    let field = header.substring(0, j).trim();
    let value = header.substring(j + 1, header.length).trim();

    if (value) {
      headers[field] = value;
    }
  }

  return headers;
}
