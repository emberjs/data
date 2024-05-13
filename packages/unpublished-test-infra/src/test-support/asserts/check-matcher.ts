function includes(message: string, search: string) {
  return message.includes ? message.includes(search) : message.includes(search);
}

export function checkMatcher(message: string, matcher: string | RegExp) {
  if (typeof matcher === 'string') {
    return includes(message, matcher);
  } else if (matcher instanceof RegExp) {
    return !!message.match(matcher);
  } else if (matcher) {
    throw new Error(`Assert helpers can only match Strings and RegExps. "${typeof matcher}" was provided.`);
  }

  // No matcher always returns true. Makes the code easier elsewhere.
  return true;
}
