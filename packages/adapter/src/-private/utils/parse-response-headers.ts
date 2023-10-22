const newline = /\r?\n/;

export default function parseResponseHeaders(headersString: string): Record<string, string> {
  const headers = Object.create(null) as Record<string, string>;

  if (!headersString) {
    return headers;
  }

  const headerPairs: string[] = headersString.split(newline);

  for (let i = 0; i < headerPairs.length; i++) {
    const header = headerPairs[i];
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

    const field = header.substring(0, j).trim();
    const value = header.substring(j + 1, header.length).trim();

    if (value) {
      const lowerCasedField = field.toLowerCase();

      headers[lowerCasedField] = value;
      headers[field] = value;
    }
  }

  return headers;
}
