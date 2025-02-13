type SCOPE = 'notify' | 'reactive-ui' | 'graph' | 'request' | 'cache';

const TEXT_COLORS = {
  TEXT: 'inherit',
  notify: ['white', 'white', 'inherit', 'magenta', 'inherit'],
  'reactive-ui': ['white', 'white', 'inherit', 'magenta', 'inherit'],
  graph: ['white', 'white', 'inherit', 'magenta', 'inherit'],
  request: ['white', 'white', 'inherit', 'magenta', 'inherit'],
  cache: ['white', 'white', 'inherit', 'magenta', 'inherit'],
};
const BG_COLORS = {
  TEXT: 'transparent',
  notify: ['dimgray', 'cadetblue', 'transparent', 'transparent', 'transparent'],
  'reactive-ui': ['dimgray', 'cadetblue', 'transparent', 'transparent', 'transparent'],
  graph: ['dimgray', 'cadetblue', 'transparent', 'transparent', 'transparent'],
  request: ['dimgray', 'cadetblue', 'transparent', 'transparent', 'transparent'],
  cache: ['dimgray', 'cadetblue', 'transparent', 'transparent', 'transparent'],
};
const NOTIFY_BORDER = {
  TEXT: 0,
  notify: [3, 2, 0, 0, 0],
  'reactive-ui': [3, 2, 0, 0, 0],
  graph: [3, 2, 0, 0, 0],
  request: [3, 2, 0, 0, 0],
  cache: [3, 2, 0, 0, 0],
};

const LIGHT_DARK_ALT: Record<string, string> = {
  lightgreen: 'green',
  green: 'lightgreen',
};

function badge(isLight: boolean, color: string, bgColor: string, border: number) {
  return [
    `color: ${correctColor(isLight, color)}; background-color: ${correctColor(isLight, bgColor)}; padding: ${border}px ${2 * border}px; border-radius: ${border}px;`,
    `color: ${TEXT_COLORS.TEXT}; background-color: ${BG_COLORS.TEXT};`,
  ];
}

function colorForBucket(isLight: boolean, scope: SCOPE, bucket: string) {
  if (scope === 'notify') {
    return bucket === 'added'
      ? badge(isLight, 'lightgreen', 'transparent', 0)
      : bucket === 'removed'
        ? badge(isLight, 'red', 'transparent', 0)
        : badge(isLight, TEXT_COLORS[scope][2], BG_COLORS[scope][2], NOTIFY_BORDER[scope][2]);
  }
  if (scope === 'reactive-ui') {
    return bucket === 'created'
      ? badge(isLight, 'lightgreen', 'transparent', 0)
      : bucket === 'disconnected'
        ? badge(isLight, 'red', 'transparent', 0)
        : badge(isLight, TEXT_COLORS[scope][2], BG_COLORS[scope][2], NOTIFY_BORDER[scope][2]);
  }
  if (scope === 'cache') {
    return bucket === 'inserted'
      ? badge(isLight, 'lightgreen', 'transparent', 0)
      : bucket === 'removed'
        ? badge(isLight, 'red', 'transparent', 0)
        : badge(isLight, TEXT_COLORS[scope][2], BG_COLORS[scope][2], NOTIFY_BORDER[scope][2]);
  }

  return badge(isLight, TEXT_COLORS[scope][3], BG_COLORS[scope][3], NOTIFY_BORDER[scope][3]);
}

export function logGroup(scope: 'cache', prefix: string, type: string, lid: string, bucket: string, key: string): void;
export function logGroup(
  scope: 'reactive-ui',
  prefix: string,
  type: string,
  lid: string,
  bucket: string,
  key: ''
): void;
export function logGroup(scope: 'notify', prefix: string, type: string, lid: string, bucket: string, key: string): void;
export function logGroup(
  scope: SCOPE,
  prefix: string,
  subScop1: string,
  subScop2: string,
  subScop3: string,
  subScop4: string
): void {
  // eslint-disable-next-line no-console
  console.groupCollapsed(..._log(scope, prefix, subScop1, subScop2, subScop3, subScop4));
}

export function log(scope: 'cache', prefix: string, type: string, lid: string, bucket: string, key: string): void;
export function log(scope: 'reactive-ui', prefix: string, type: string, lid: string, bucket: string, key: ''): void;
export function log(scope: 'notify', prefix: string, type: string, lid: string, bucket: string, key: string): void;
export function log(
  scope: SCOPE,
  prefix: string,
  subScop1: string,
  subScop2: string,
  subScop3: string,
  subScop4: string
): void {
  // eslint-disable-next-line no-console
  console.log(..._log(scope, prefix, subScop1, subScop2, subScop3, subScop4));
}

function correctColor(isLight: boolean, color: string) {
  if (!isLight) {
    return color;
  }
  return color in LIGHT_DARK_ALT ? LIGHT_DARK_ALT[color] : color;
}

function isLightMode() {
  if (window?.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return true;
  }
  return false;
}

function _log(
  scope: SCOPE,
  prefix: string,
  subScop1: string,
  subScop2: string,
  subScop3: string,
  subScop4: string
): string[] {
  const isLight = isLightMode();
  switch (scope) {
    case 'reactive-ui':
    case 'notify': {
      const scopePath = prefix ? `[${prefix}] ${scope}` : scope;
      const path = subScop4 ? `${subScop3}.${subScop4}` : subScop3;
      return [
        `%c@warp%c-%cdrive%c %c${scopePath}%c %c${subScop1}%c %c${subScop2}%c %c${path}%c`,
        ...badge(isLight, 'lightgreen', 'transparent', 0),
        ...badge(isLight, 'magenta', 'transparent', 0),
        ...badge(isLight, TEXT_COLORS[scope][0], BG_COLORS[scope][0], NOTIFY_BORDER[scope][0]),
        ...badge(isLight, TEXT_COLORS[scope][1], BG_COLORS[scope][1], NOTIFY_BORDER[scope][1]),
        ...badge(isLight, TEXT_COLORS[scope][2], BG_COLORS[scope][2], NOTIFY_BORDER[scope][2]),
        ...colorForBucket(isLight, scope, path),
      ];
    }
    case 'cache': {
      const scopePath = prefix ? `${scope} (${prefix})` : scope;
      return [
        `%c@warp%c-%cdrive%c %c${scopePath}%c %c${subScop1}%c %c${subScop2}%c %c${subScop3}%c %c${subScop4}%c`,
        ...badge(isLight, 'lightgreen', 'transparent', 0),
        ...badge(isLight, 'magenta', 'transparent', 0),
        ...badge(isLight, TEXT_COLORS[scope][0], BG_COLORS[scope][0], NOTIFY_BORDER[scope][0]),
        ...badge(isLight, TEXT_COLORS[scope][1], BG_COLORS[scope][1], NOTIFY_BORDER[scope][1]),
        ...badge(isLight, TEXT_COLORS[scope][2], BG_COLORS[scope][2], NOTIFY_BORDER[scope][2]),
        ...colorForBucket(isLight, scope, subScop3),
        ...badge(isLight, TEXT_COLORS[scope][4], BG_COLORS[scope][4], NOTIFY_BORDER[scope][4]),
      ];
    }
  }
  return [];
}
