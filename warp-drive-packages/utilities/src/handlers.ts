/**
 * A selection of pre-built request handlers for handling common
 * request scenarios.
 *
 * @module
 */
export { AutoCompress, SupportsRequestStreams } from './-private/handlers/auto-compress.ts';
export { Gate } from './-private/handlers/gated.ts';
export {
  addTraceHeader,
  TAB_ASSIGNED,
  TAB_ID,
  assertInvalidUrlLength,
  MAX_URL_LENGTH,
} from './-private/handlers/utils.ts';
