/**
  @module @ember-data/store
*/

// support IE11
declare global {
  interface Window {
    msCrypto: Crypto;
  }
}

const CRYPTO = (() => {
  const hasWindow = typeof window !== 'undefined';
  const isFastBoot = typeof FastBoot !== 'undefined';

  if (isFastBoot) {
    return {
      getRandomValues(buffer: Uint8Array) {
        try {
          return (FastBoot as FastBoot).require('crypto').randomFillSync(buffer);
        } catch (err) {
          throw new Error(
            'Using createRecord in Fastboot requires you to add the "crypto" package to "fastbootDependencies" in your package.json'
          );
        }
      },
    };
  } else if (hasWindow && typeof window.crypto !== 'undefined') {
    return window.crypto;
  } else if (
    hasWindow &&
    typeof window.msCrypto !== 'undefined' &&
    typeof window.msCrypto.getRandomValues === 'function'
  ) {
    return window.msCrypto;
  } else {
    throw new Error('ember-data: Cannot find a valid way to generate local identifiers');
  }
})();

// we might be able to optimize this by requesting more bytes than we need at a time
function rng() {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  let rnds8 = new Uint8Array(16);

  return CRYPTO.getRandomValues(rnds8);
}

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex: string[] = [];
for (let i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf) {
  let bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return [
    bth[buf[0]],
    bth[buf[1]],
    bth[buf[2]],
    bth[buf[3]],
    '-',
    bth[buf[4]],
    bth[buf[5]],
    '-',
    bth[buf[6]],
    bth[buf[7]],
    '-',
    bth[buf[8]],
    bth[buf[9]],
    '-',
    bth[buf[10]],
    bth[buf[11]],
    bth[buf[12]],
    bth[buf[13]],
    bth[buf[14]],
    bth[buf[15]],
  ].join('');
}

export default function uuidv4(): string {
  let rnds = rng();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  return bytesToUuid(rnds);
}
