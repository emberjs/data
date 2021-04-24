import { resolve } from 'rsvp';

export default function continueOnReject<T>(promise: Promise<T>): Promise<T> {
  return resolve(promise).catch((e) => e);
}
