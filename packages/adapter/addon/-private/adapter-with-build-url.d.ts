import EmberObject from '@ember/object';

import { ResolvedRegistry } from '@ember-data/types';

import { BuildURLMixin } from '.';

export default interface AdapterWithBuildUrl<R extends ResolvedRegistry> extends BuildURLMixin<R> {
  new (): AdapterWithBuildUrl<R>;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class AdapterWithBuildUrl<R extends ResolvedRegistry> extends EmberObject {}
