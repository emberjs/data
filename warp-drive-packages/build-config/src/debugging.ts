/**
 * # Log Instrumentation <Badge type="tip" text="debug only" />
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
 * ## Runtime Activation
 *
 * ::: tip 💡 Just Works in browser Dev Tools!
 * No import is needed, and the logging config is preserved when the page is refreshed
 * :::
 *
 * ```ts
 * setWarpDriveLogging({
 *   LOG_CACHE: true,
 *   LOG_REQUESTS: true,
 * })
 * ```
 *
 * A runtime helper is attached to `globalThis` to enable activation of the logs
 * from anywhere in your application including from the devtools panel.
 *
 * The runtime helper overrides any build config settings for the given flag
 * for the current browser tab. It stores the configuration you give it in
 * `sessionStorage` so that it persists across page reloads of the current tab,
 * but not across browser tabs or windows.
 *
 * If you need to deactivate the logging, you can call the helper again with the
 * same flag set to `false` or just open a new tab/window.
 *
 * ## Buildtime Activation
 *
 * ```ts
 * setConfig(__dirname, app, {
 *   debug: {
 *     LOG_CACHE: true,
 *     LOG_REQUESTS: false,
 *     LOG_NOTIFICATIONS: true,
 *   }
 * });
 * ```
 *
 * The build config settings are used to set the default values for the
 * logging flags. Any logging flag that is not set in the build config
 * will default to `false`.
 *
 * @module
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
 * @public
 * @since 5.5
 */
export const LOG_CACHE: boolean = false;

/**
 * <Badge type="danger" text="removed" />
 *
 * This flag no longer has any effect.
 *
 * Use {@link LOG_CACHE} instead.
 *
 * @deprecated removed in version 5.5
 * @public
 */
export const LOG_PAYLOADS: boolean = false;

/**
 * <Badge type="danger" text="removed" />
 *
 * This flag no longer has any effect.
 *
 * Use {@link LOG_CACHE} instead.
 *
 * @deprecated removed in version 5.5
 * @public
 */
export const LOG_OPERATIONS: boolean = false;

/**
 * <Badge type="danger" text="removed" />
 *
 * This flag no longer has any effect.
 *
 * Use {@link LOG_CACHE} instead.
 *
 * @deprecated removed in version 5.5
 * @public
 */
export const LOG_MUTATIONS: boolean = false;

/**
 * Log decisions made by the Basic CachePolicy
 *
 * @public
 */
export const LOG_CACHE_POLICY: boolean = false;

/**
 * log notifications received by the NotificationManager
 *
 * @public
 */
export const LOG_NOTIFICATIONS: boolean = false;
/**
 * log requests issued by the RequestManager
 *
 * @public
 */
export const LOG_REQUESTS: boolean = false;
/**
 * log updates to requests the store has issued to
 * the network (adapter) to fulfill.
 *
 * @public
 */
export const LOG_REQUEST_STATUS: boolean = false;
/**
 * log peek, generation and updates to
 * Record Identifiers.
 *

 * @public
 */
export const LOG_IDENTIFIERS: boolean = false;
/**
 * log updates received by the graph (relationship pointer storage)
 *
 * @public
 */
export const LOG_GRAPH: boolean = false;
/**
 * log creation/removal of RecordData and Record
 * instances.
 *
 * @public
 */
export const LOG_INSTANCE_CACHE: boolean = false;
/**
 * Log key count metrics, useful for performance
 * debugging.
 *
 * @public
 */
export const LOG_METRIC_COUNTS: boolean = false;
/**
 * Helps when debugging causes of a change notification
 * when processing an update to a hasMany relationship.
 *
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
 * @private
 */
export const __INTERNAL_LOG_NATIVE_MAP_SET_COUNTS: boolean = false;

/**
 * Helps when debugging React specific reactivity issues.
 */
export const LOG_REACT_SIGNAL_INTEGRATION: boolean = false;
