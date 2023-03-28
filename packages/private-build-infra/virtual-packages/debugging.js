/**
  @module @ember-data/debug
 */
/**
 *
 * Many portions of the internals are helpfully instrumented with logging that can be activated
at build time. This instrumentation is always removed from production builds or any builds
that has not explicitly activated it. To activate it set the appropriate flag to `true`.

```ts
  let app = new EmberApp(defaults, {
    emberData: {
      debug: {
          LOG_PAYLOADS: false, // data store received to update cache with
          LOG_OPERATIONS: false, // updates to cache remote state
          LOG_MUTATIONS: false, // updates to cache local state
          LOG_NOTIFICATIONS: false,
          LOG_REQUESTS: false,
          LOG_REQUEST_STATUS: false,
          LOG_IDENTIFIERS: false,
          LOG_GRAPH: false,
          LOG_INSTANCE_CACHE: false,
      }
    }
  });
  ```

  @class DebugLogging
  @public
 */
/**
 * log payloads received by the store
 * via `push` or returned from a delete/update/create
 * operation.
 *
 * @property {boolean} LOG_PAYLOADS
 * @public
 */
export const LOG_PAYLOADS = false;
/**
 * log remote-state updates to the cache
 *
 * @property {boolean} LOG_OPERATIONS
 * @public
 */
export const LOG_OPERATIONS = false;
/**
 * log local-state updates to the cache
 *
 * @property {boolean} LOG_MUTATIONS
 * @public
 */
export const LOG_MUTATIONS = false;
/**
 * log notifications received by the NotificationManager
 *
 * @property {boolean} LOG_NOTIFICATIONS
 * @public
 */
export const LOG_NOTIFICATIONS = false;
/**
 * log requests issued by the RequestManager
 *
 * @property {boolean} LOG_REQUESTS
 * @public
 */
export const LOG_REQUESTS = false;
/**
 * log updates to requests the store has issued to
 * the network (adapter) to fulfill.
 *
 * @property {boolean} LOG_REQUEST_STATUS
 * @public
 */
export const LOG_REQUEST_STATUS = false;
/**
 * log peek, generation and updates to
 * Record Identifiers.
 *
 * @property {boolean} LOG_IDENTIFIERS
 * @public
 */
export const LOG_IDENTIFIERS = false;
/**
 * log updates received by the graph (relationship pointer storage)
 *
 * @property {boolean} LOG_GRAPH
 * @public
 */
export const LOG_GRAPH = false;
/**
 * log creation/removal of RecordData and Record
 * instances.
 *
 * @property {boolean} LOG_INSTANCE_CACHE
 * @public
 */
export const LOG_INSTANCE_CACHE = false;
