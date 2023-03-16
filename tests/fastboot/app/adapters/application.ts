import RESTAdapter from '@ember-data/adapter/rest';
import type { SnapshotRecordArray } from '@ember-data/store/-private';

export default class ApplicationAdapter extends RESTAdapter {
  namespace = 'api';

  urlForFindAll(type: string, snapshots: SnapshotRecordArray) {
    let url = super.urlForFindAll(type, snapshots);
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 2);
    }
    return url + '.json';
  }
}
