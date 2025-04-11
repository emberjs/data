/**
  @module @warp-drive/build-config
 */
/**
 * ## Debug Logging
 *
 * Many portions of the internals are helpfully instrumented with logging that can be activated
 * at build time. This instrumentation is always removed from production builds or any builds
 * that has not explicitly activated it. To activate it set the appropriate flag to `true`.
 *
 * ```ts
 * setConfig(__dirname, app, {
 *   debug: {
 *     LOG_CACHE: false, // data store received to update cache with
 *     LOG_NOTIFICATIONS: false,
 *     LOG_REQUESTS: false,
 *     LOG_REQUEST_STATUS: false,
 *     LOG_IDENTIFIERS: false,
 *     LOG_GRAPH: false,
 *     LOG_INSTANCE_CACHE: false,
 *     LOG_METRIC_COUNTS: false,
 *     DEBUG_RELATIONSHIP_NOTIFICATIONS: false,
 *   }
 * });
 * ```
 *
 * @class DebugLogging
 * @public
 */
/**
 * log cache updates for both local
 * and remote state.
 *
 * @property {boolean} LOG_CACHE
 * @public
 */
export const LOG_CACHE: boolean = false;

/**
 * log notifications received by the NotificationManager
 *
 * @property {boolean} LOG_NOTIFICATIONS
 * @public
 */
export const LOG_NOTIFICATIONS: boolean = false;
/**
 * log requests issued by the RequestManager
 *
 * @property {boolean} LOG_REQUESTS
 * @public
 */
export const LOG_REQUESTS: boolean = false;
/**
 * log updates to requests the store has issued to
 * the network (adapter) to fulfill.
 *
 * @property {boolean} LOG_REQUEST_STATUS
 * @public
 */
export const LOG_REQUEST_STATUS: boolean = false;
/**
 * log peek, generation and updates to
 * Record Identifiers.
 *
 * @property {boolean} LOG_IDENTIFIERS
 * @public
 */
export const LOG_IDENTIFIERS: boolean = false;
/**
 * log updates received by the graph (relationship pointer storage)
 *
 * @property {boolean} LOG_GRAPH
 * @public
 */
export const LOG_GRAPH: boolean = false;
/**
 * log creation/removal of RecordData and Record
 * instances.
 *
 * @property {boolean} LOG_INSTANCE_CACHE
 * @public
 */
export const LOG_INSTANCE_CACHE: boolean = false;
/**
 * Log key count metrics, useful for performance
 * debugging.
 *
 * @property {boolean} LOG_METRIC_COUNTS
 * @public
 */
export const LOG_METRIC_COUNTS: boolean = false;
/**
 * Helps when debugging causes of a change notification
 * when processing an update to a hasMany relationship.
 *
 * @property {boolean} DEBUG_RELATIONSHIP_NOTIFICATIONS
 * @public
 */
export const DEBUG_RELATIONSHIP_NOTIFICATIONS: boolean = false;

/**
 * A private flag to enable logging of the native Map/Set
 * constructor and method calls.
 *
 * EXTREMELY MALPERFORMANT
 *
 * LOG_METRIC_COUNTS must also be enabled.
 *
 * @typedoc
 */
export const __INTERNAL_LOG_NATIVE_MAP_SET_COUNTS: boolean = false;
