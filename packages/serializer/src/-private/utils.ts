type Coercable = string | number | boolean | null | undefined | symbol;

export function coerceId(id: Coercable): string | null {
  if (id === null || id === undefined || id === '') {
    return null;
  } else if (typeof id === 'string') {
    return id;
  } else if (typeof id === 'symbol') {
    return id.toString();
  } else {
    return String(id);
  }
}
