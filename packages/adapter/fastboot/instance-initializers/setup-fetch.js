import { setupFastboot } from '@ember-data/adapter/-private';

/**
 * To allow relative URLs for Fastboot mode, we need the per request information
 * from the fastboot service. Then we save the request from fastboot info.
 * On each fetch with relative url we get host and protocol from it.
 */
function patchFetchForRelativeURLs(instance) {
  const fastboot = instance.lookup('service:fastboot');
  setupFastboot(fastboot.get('request'));
}

export default {
  name: 'fetch',
  initialize: patchFetchForRelativeURLs,
};
