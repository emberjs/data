import _debug from 'debug';

const _log = _debug('wd:diagnostic');

export const DEBUG_LEVEL = parseDebugLevel(process.env.DEBUG_LEVEL);

function parseDebugLevel(v: string | number | undefined): number {
  if (typeof v === 'string' && v && isNaN(Number(v))) {
    return getDebugLevel(v);
  } else if (typeof v === 'number') {
    return v;
  } else if (v && !isNaN(Number(v))) {
    return Number(v);
  }
  return 1;
}

function getDebugLevel(str: string) {
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

export function loggingIsEnabled(): boolean {
  return _log.enabled;
}

export function print(message: string) {
  if (_log.enabled) {
    _log(message);
  } else {
    console.log(message);
  }
}

export function debug(message: string) {
  if (DEBUG_LEVEL === 0) {
    _log(message);
  }
}

export function log(message: string) {
  if (DEBUG_LEVEL <= 1) {
    _log(message);
  }
}

export function info(message: string) {
  if (DEBUG_LEVEL <= 1) {
    _log(message);
  }
}

export function warn(message: string) {
  if (DEBUG_LEVEL <= 2) {
    _log(message);
  }
}

export function error(message: string) {
  _log(message);
}
