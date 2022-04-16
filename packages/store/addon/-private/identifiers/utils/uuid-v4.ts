/**
  @module @ember-data/store
*/

const isFastBoot = typeof FastBoot !== 'undefined';
const _crypto: Crypto = isFastBoot ? ((FastBoot as FastBoot).require('crypto') as Crypto) : window.crypto;

export default function uuidv4(): string {
  return _crypto.randomUUID();
}
