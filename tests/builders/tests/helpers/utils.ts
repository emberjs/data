export function headersToObject(headers: Headers) {
  const result: { [key: string]: string } = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
