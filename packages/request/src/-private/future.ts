/**
 * @module @ember-data/request
 */
export interface StructuredDocument<T> {
  request: RequestInfo;
  response: Response;
  data?: T;
  error?: Error;
}

/**
 * @class Future
 */
export interface Future<T> extends Promise<StructuredDocument<T>> {
  /**
   * Cancel this request by firing the AbortController's signal.
   *
   * @method abort
   * @public
   * @returns {void}
   */
  abort(): void;

  /**
   * Get the response stream, if any, once made available.
   *
   * @method getStream
   * @public
   * @returns {Promise<ReadableStream | null>}
   */
  getStream(): Promise<ReadableStream | null>;
}

export function createFuture<T>(promise: Promise<T>): Future<T> {}
