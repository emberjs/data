import { ResolvedRegistry } from '@ember-data/types';

import { BuildURLMixin as Mixin } from './build-url-mixin-base';

export default interface BuildURLMixin<R extends ResolvedRegistry> extends Mixin<R> {}
