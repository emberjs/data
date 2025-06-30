import { assert } from '@warp-drive/core/build-config/macros';

if (typeof FastBoot === 'undefined') {
  globalThis.addEventListener('beforeunload', function () {
    sessionStorage.setItem('tab-closed', 'true');
  });
}

function getTabId() {
  if (typeof sessionStorage === 'undefined') {
    return crypto.randomUUID();
  }

  const tabId = sessionStorage.getItem('tab-id');
  if (tabId) {
    const tabClosed = sessionStorage.getItem('tab-closed');
    if (tabClosed === 'true') {
      return tabId;
    }

    // fall through to generate a new tab id
  }

  const newTabId = crypto.randomUUID();
  sessionStorage.setItem('tab-id', newTabId);
  return newTabId;
}

/**
 * A unique identifier for the current browser tab
 * useful for observability/tracing and deduping
 * across multiple tabs.
 */
export const TAB_ID: string = getTabId();
/**
 * The epoch seconds at which the tab id was generated
 */
export const TAB_ASSIGNED: number = Math.floor(Date.now() / 1000);

/**
 * Adds the `X-Amzn-Trace-Id` header to support observability
 * tooling around request routing.
 *
 * This makes use of the {@link TAB_ID} and {@link TAB_ASSIGNED}
 * to enable tracking the browser tab of origin across multiple requests.
 *
 * Follows the template: `Root=1-${now}-${uuidv4};TabId=1-${epochSeconds}-${tab-uuid}`
 */
export function addTraceHeader(headers: Headers): Headers {
  const now = Math.floor(Date.now() / 1000);
  headers.set('X-Amzn-Trace-Id', `Root=1-${now}-${crypto.randomUUID()};TabId=1-${TAB_ASSIGNED}-${TAB_ID}`);

  return headers;
}

/**
 * Source: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
 * As of 2024-12-05 the maximum URL length is 8192 bytes.
 *
 */
export const MAX_URL_LENGTH = 8192;

/**
 * This assertion takes a URL and throws an error if the URL is longer than the maximum URL length.
 *
 * See also {@link MAX_URL_LENGTH}
 */
export function assertInvalidUrlLength(url: string | undefined): void {
  assert(
    `URL length ${url?.length} exceeds the maximum URL length of ${MAX_URL_LENGTH} bytes.\n\nConsider converting this request query a \`/query\` endpoint instead of a GET, or upgrade the current endpoint to be able to receive a POST request directly (ideally specifying the header HTTP-Method-Override: QUERY)\n\nThe Invalid URL is:\n\n${url}`,
    !url || url.length <= MAX_URL_LENGTH
  );
}
