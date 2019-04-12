import { isEnabled } from '@ember/canary-features';

export default function featureIsEnabled() {
  return isEnabled(...arguments);
}
