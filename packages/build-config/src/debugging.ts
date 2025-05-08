/**
  @module @warp-drive/build-config
 */
/**
 * ## Debug Logging
 *
 * Many portions of the internals are helpfully instrumented with logging.
 * This instrumentation is always removed from production builds.
 *
 * Log instrumentation is "regionalized" to specific concepts and concerns
 * to enable you to enable/disable just the areas you are interested in.
 *
 * To activate a particular group of logs set the appropriate flag to `true`
 * either in your build config or via the runtime helper.
 *
 *
 * ### Activation Via Runtime Helper
 *
 * A runtime helper is attached to `globalThis` to enable activation of the logs
 * from anywhere in your application including from the devtools panel.
 *
 * The runtime helper overrides any build config settings for the given flag
 * for the current browser tab. It stores the configuration you give it in
 * `sessionStorage` so that it persists across page reloads of the current tab,
 * but not across browser tabs or windows. Thus if you need to deactivate the
 * logging, you can call the helper again with the same flag set to `false` or
 * just open a new tab/window.
 *
 * Example Usage:
 *
 * ```ts
 * setWarpDriveLogging({
 *   LOG_CACHE: true,
 *   LOG_REQUESTS: true,
 * })
 * ```
 *
 * ### Activation Via Build Config
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
 * and remote state. Note in some older versions
 * this was called `LOG_PAYLOADS` and was one
 * of three flags that controlled logging of
 * cache updates. This is now the only flag.
 *
 * The others were `LOG_OPERATIONS` and `LOG_MUTATIONS`.
 *
 * @property LOG_CACHE
 * @type {Boolean}
 * @public
 */
export const LOG_CACHE: boolean = false;
/**
 * Log decisions made by the Basic CachePolicy
 *
 * @property LOG_CACHE_POLICY
 * @type {Boolean}
 * @public
 */
export const LOG_CACHE_POLICY: boolean = false;

/**
 * log notifications received by the NotificationManager
 *
 * @property LOG_NOTIFICATIONS
 * @type {Boolean}
 * @public
 */
export const LOG_NOTIFICATIONS: boolean = false;
/**
 * log requests issued by the RequestManager
 *
 * @property LOG_REQUESTS
 * @type {Boolean}
 * @public
 */
export const LOG_REQUESTS: boolean = false;
/**
 * log updates to requests the store has issued to
 * the network (adapter) to fulfill.
 *
 * @property LOG_REQUEST_STATUS
 * @type {Boolean}
 * @public
 */
export const LOG_REQUEST_STATUS: boolean = false;
/**
 * log peek, generation and updates to
 * Record Identifiers.
 *
 * @property LOG_IDENTIFIERS
 * @type {Boolean}

 * @public
 */
export const LOG_IDENTIFIERS: boolean = false;
/**
 * log updates received by the graph (relationship pointer storage)
 *
 * @property LOG_GRAPH
 * @type {Boolean}
 * @public
 */
export const LOG_GRAPH: boolean = false;
/**
 * log creation/removal of RecordData and Record
 * instances.
 *
 * @property LOG_INSTANCE_CACHE
 * @type {Boolean}
 * @public
 */
export const LOG_INSTANCE_CACHE: boolean = false;
/**
 * Log key count metrics, useful for performance
 * debugging.
 *
 * @property LOG_METRIC_COUNTS
 * @type {Boolean}
 * @public
 */
export const LOG_METRIC_COUNTS: boolean = false;
/**
 * Helps when debugging causes of a change notification
 * when processing an update to a hasMany relationship.
 *
 * @property DEBUG_RELATIONSHIP_NOTIFICATIONS
 * @type {Boolean}
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
