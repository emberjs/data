import RSVP from 'rsvp';

export function initialize(/* application */) {
  // force async-await polyfill to use RSVP
  window.Promise = RSVP.Promise;
}

export default {
  name: 'set-global-promise-for-async-await',
  initialize
};
