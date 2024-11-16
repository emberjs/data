import ArrayProxy from '@ember/array/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

import { reads } from '@ember/object/computed';
export class PromiseArrayProxy extends ArrayProxy.extend(PromiseProxyMixin) {
  @reads('content.meta') meta;
}
export const PromiseObjectProxy = ObjectProxy.extend(PromiseProxyMixin);
