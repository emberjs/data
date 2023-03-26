export default function continueOnReject<T>(promise: Promise<T>): Promise<T> {
  return Promise.resolve(promise).catch((e) => e);
}
