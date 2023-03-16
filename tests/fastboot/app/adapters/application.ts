import RESTAdapter from '@ember-data/adapter/rest';

export default class ApplicationAdapter extends RESTAdapter {
  namespace = 'api';

  urlForFindAll(...args: unknown[]) {
    let url = super.urlForFindAll(...args);
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 2);
    }
    return url + '.json';
  }
}
