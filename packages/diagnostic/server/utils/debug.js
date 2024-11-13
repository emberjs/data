import _debug from 'debug';
const _log = _debug('wd:diagnostic');

export const DEBUG_LEVEL = parseDebugLevel(process.env.DEBUG_LEVEL);

function parseDebugLevel(v) {
  if (typeof v === 'string' && v && isNaN(Number(v))) {
    return getDebugLevel(v);
  } else if (typeof v === 'number') {
    return v;
  } else if (v && !isNaN(Number(v))) {
    return Number(v);
  }
  return 1;
}

function getDebugLevel(str) {
  switch (str.toLowerCase()) {
    case 'debug':
      return 0;
    case 'info':
    case 'log':
      return 1;
    case 'warn':
      return 2;
    case 'error':
      return 3;
    default:
      return 1;
  }
}

export function print(message) {
  if (_log.enabled) {
    _log(message);
  } else {
    console.log(message);
  }
}

export function debug(message) {
  if (DEBUG_LEVEL === 0) {
    _log(message);
  }
}

export function log(message) {
  if (DEBUG_LEVEL <= 1) {
    _log(message);
  }
}

export function info(message) {
  if (DEBUG_LEVEL <= 1) {
    _log(message);
  }
}

export function warn(message) {
  if (DEBUG_LEVEL <= 2) {
    _log(message);
  }
}

export function error(message) {
  _log(message);
}
