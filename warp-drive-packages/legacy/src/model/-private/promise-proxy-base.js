import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

export const PromiseObject = ObjectProxy.extend(PromiseProxyMixin);
