/**
 * A utility function that returns a promise that resolves
 * even when the source promise rejects.
 *
 * @internal
 */
export default function continueOnReject<T>(promise: Promise<T>): Promise<T> {
  return Promise.resolve(promise).catch((e) => e as T);
}
