function includes(message, search) {
  return message.includes ? message.includes(search) : message.indexOf(search) !== -1;
}

export function checkMatcher(message, matcher) {
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
