import Route from '@ember/routing/route';
import * as s from '@ember/service';

import { setBuildURLConfig } from '@warp-drive/utilities';
import { query } from '@warp-drive/utilities/json-api';

import type Person from '../models/person';
import type Store from '../services/store';

const service = s.service ?? s.inject;

export default class IndexRoute extends Route {
  @service declare store: Store;
  @service declare fastboot: {
    isFastBoot: boolean;
    request?: { host: string };
  };

  async model() {
    const host = this.fastboot.isFastBoot ? (this.fastboot.request?.host ?? '/') : window.location.host;
    setBuildURLConfig({ host: `http://${host}`, namespace: 'api' });
    const queryInit = query<Person>('person', {}, { resourcePath: 'people.json' });

    const {
      content: { data },
    } = await this.store.request(queryInit);

    return data;
  }
}
