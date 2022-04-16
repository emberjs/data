import ArrayProxy from '@ember/array/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

export const PromiseArrayProxy = ArrayProxy.extend(PromiseProxyMixin);

export const PromiseObjectProxy = ObjectProxy.extend(PromiseProxyMixin);
