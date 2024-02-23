import chalk from 'chalk';

export function getCharLength(str: string | undefined): number {
  if (!str) {
    return 0;
  }
  // The string iterator that is used here iterates over characters,
  // not mere code units
  let count = 0;
  let isColorChar = false;

  // color chars follow the pattern
  // \u001b[<number>m
  for (const char of str) {
    if (isColorChar && char === 'm') {
      isColorChar = false;
    } else if (char === '\u001b' || char === '\u001B') {
      isColorChar = true;
    } else if (!isColorChar) {
      count++;
    }
  }

  return count;
}

export function adjustForWords(str: string, max_length: number) {
  // The string iterator that is used here iterates over characters,
  // not mere code units
  let count = 0;
  let len = 0;
  let lastWhitespaceLen = 0;
  let isColorChar = false;
  let isMaybeStartingWhitespace = true;

  // color chars follow the pattern
  // \u001b[<number>m
  for (const char of str) {
    let charIndex = len;
    len++;
    if (isMaybeStartingWhitespace) {
      if (char === ' ' || char === '\t') {
        // increment len but not count
        lastWhitespaceLen = charIndex;
        continue;
      } else {
        isMaybeStartingWhitespace = false;
      }
    }

    if (isColorChar && char === 'm') {
      isColorChar = false;
    } else if (char === '\u001b') {
      isColorChar = true;
    } else if (!isColorChar) {
      count++;
      if (count > max_length) {
        return lastWhitespaceLen;
      }
      if (char === ' ' || char === '\t') {
        lastWhitespaceLen = charIndex;
      }
    }
  }

  return len;
}

export function indent(str: string, depth = 1) {
  const indentStr = getPadding(depth);
  return str
    .split('\n')
    .map((line) => {
      return indentStr + line;
    })
    .join('\n');
}

export function getPadding(depth: number, filler = '\t') {
  return new Array(depth).fill(filler).join('');
}

export function getNumTabs(str: string) {
  let len = Math.max(4, str.length);
  len = Math.min(len, 8);
  return 3 - Math.round(len / 4);
}

/**
 * colorizes a string based on color<<>> syntax
 * where color is one of the following:
 * - gr (grey)
 * - bg (brightGreen)
 * - bm (brightMagenta)
 * - cy (cyan)
 * - ye (yellow)
 *
 * e.g.
 *
 * color`This is gr<<grey>> and this is bg<<bright green>> and this is bm<<bright magenta>> and this is cy<<cyan>> and this is ye<<yellow>>`
 */
export function color(str: string) {
  const colors = {
    gr: 'grey',
    gb: 'greenBright',
    mb: 'magentaBright',
    cy: 'cyan',
    ye: 'yellow',
  };

  const colorized = str.replace(/(\w+)<<(.+?)>>/g, (match, color, text) => {
    const c = colors[color];
    if (!c) {
      throw new Error(`Unknown color ${color}`);
    }
    return chalk[c](text);
  });

  return colorized;
}

// TODO if the last line of a context is too long we don't always
// end up rebalancing correctly. We need to splice an additional
// line in in this case. If we do this on a rolling basis its
// probably easier.
export function rebalanceLines(str: string, max_length = 75): string {
  const lines = str.split('\n');
  let inContext = false;
  let contextIndent = '';
  let contextHasBullet = false;
  let contextIndex = 0;
  let contextBulletIndent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') {
      inContext = false;
      continue;
    }
    if (line.trim() === '---') {
      lines[i] = chalk.grey(getPadding(max_length, '-'));
      inContext = false;
      continue;
    }
    if (line.trim() === '===') {
      lines[i] = chalk.grey(getPadding(max_length, '='));
      inContext = false;
      continue;
    }

    let indentMatch = line.match(/^\s+/);
    let hasBullet = line.match(/^\s*[-\*]\s+/) || line.match(/^\s*\d+\)?\.\s+/);
    let bulletIndent = hasBullet ? hasBullet[0] : '';
    let indent = '';

    if (indentMatch) {
      indent = indentMatch[0];
    }

    // if we have our own bullet, this is a new context
    // so nothing can be rebalanced
    if (hasBullet || !inContext) {
      contextIndex = i;
      inContext = true;
      contextIndent = indent;
      contextHasBullet = Boolean(hasBullet);
      contextBulletIndent = bulletIndent;
      continue;
    }

    const isBulletContinuation =
      contextHasBullet && indent.startsWith(contextIndent) && indent.length === contextBulletIndent.length;
    const isNonBulletContinuation = !contextHasBullet && indent === contextIndent;

    // determine if we match
    if (isBulletContinuation || isNonBulletContinuation) {
      // we are in the same context
      // rebalance if needed
      const fullText = lines[contextIndex] + ' ' + line.slice(indent.length);
      const len = adjustForWords(fullText, max_length);
      const prevLine = fullText.slice(0, len).trimEnd();
      const thisLine = indent + fullText.slice(len).trim();
      lines[contextIndex] = prevLine;
      lines[i] = thisLine || (null as unknown as string);
      if (thisLine) {
        // only update if we have content on the line
        contextIndex = i;
      }
    } else {
      // we are a new context
      contextIndex = i;
      inContext = true;
      contextIndent = (indent as unknown as string) || '';
      contextHasBullet = false;
      contextBulletIndent = '';
      continue;
    }
  }

  return lines.filter((l) => l !== null).join('\n');
}
