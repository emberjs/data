import type { SnapshotRecordArray } from '@ember-data/adapter/-private';
import RESTAdapter from '@ember-data/adapter/rest';

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
