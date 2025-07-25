interface FastbootCrypto {
  randomFillSync(v: Uint8Array): Uint8Array;
}

type UUIDv4 = `${string}-${string}-${string}-${string}-${string}`;

export default function installPolyfill(): void {
  const isFastBoot = typeof FastBoot !== 'undefined';
  const CRYPTO: Crypto = isFastBoot ? (FastBoot.require('crypto') as Crypto) : globalThis.crypto;

  if (!CRYPTO.randomUUID) {
    // we might be able to optimize this by requesting more bytes than we need at a time
    const rng = function (): Uint8Array {
      // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
      const rnds8 = new Uint8Array(16);

      if (!CRYPTO.getRandomValues && !isFastBoot) {
        throw new Error(`Unable to generate bytes for UUID`);
      }

      return CRYPTO.getRandomValues
        ? CRYPTO.getRandomValues(rnds8)
        : (CRYPTO as unknown as FastbootCrypto).randomFillSync(rnds8);
    };

    /*
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    const byteToHex: string[] = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex[i] = (i + 0x100).toString(16).substr(1);
    }

    const bytesToUuid = function (buf: Uint8Array): UUIDv4 {
      const bth = byteToHex;
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
      ].join('') as UUIDv4;
    };

    CRYPTO.randomUUID = function uuidv4(): UUIDv4 {
      const rnds = rng();

      // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
      rnds[6] = (rnds[6] & 0x0f) | 0x40;
      rnds[8] = (rnds[8] & 0x3f) | 0x80;

      return bytesToUuid(rnds);
    };
  }
}
