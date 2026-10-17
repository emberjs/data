/**
 * A selection of pre-built request handlers for handling common
 * request scenarios.
 *
 * @summary Ready-made request handlers for body compression, conditional handling, and meta-only responses, plus
 * tracing helpers.
 * @module
 */
export { AutoCompress, SupportsRequestStreams } from './-private/handlers/auto-compress.ts';
export type { CompressionOptions, Constraints } from './-private/handlers/auto-compress.ts';
export { Gate } from './-private/handlers/gated.ts';
export { IMUXHandler, type IMUXHandlerOptions, type IMUXRequestOptions } from './-private/handlers/imux.ts';
export { MetaDocHandler } from './-private/handlers/meta-doc.ts';

export {
  addTraceHeader,
  TAB_ASSIGNED,
  TAB_ID,
  assertInvalidUrlLength,
  MAX_URL_LENGTH,
} from './-private/handlers/utils.ts';
