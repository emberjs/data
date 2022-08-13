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
          LOG_NOTIFICATIONS: false,
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
 * log notifications received by the RecordNotificationManager
 *
 * @property {boolean} LOG_NOTIFICATIONS
 * @public
 */
export const LOG_NOTIFICATIONS = false;
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
