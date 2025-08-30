/**
 * This module provides a build-plugin that enables configuration of deprecations,
 * optional features, development/testing support and debug logging.
 *
 * Available settings include:
 *
 * - {@link LOGGING | debugging}
 * - {@link DEPRECATIONS | deprecations}
 * - {@link FEATURES | features}
 * - {@link WarpDriveConfig.polyfillUUID | polyfillUUID}
 * - {@link WarpDriveConfig.includeDataAdapterInProduction | includeDataAdapterInProduction}
 * - {@link WarpDriveConfig.compatWith | compatWith}
 *
 * @module
 */
import type { WarpDriveConfig } from '@warp-drive/build-config';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as FEATURES from '@warp-drive/build-config/canary-features';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as LOGGING from '@warp-drive/build-config/debugging';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as DEPRECATIONS from '@warp-drive/build-config/deprecations';

export { setConfig, babelPlugin } from '@warp-drive/build-config';
export type { WarpDriveConfig };
