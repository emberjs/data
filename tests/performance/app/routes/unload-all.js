import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/unload-all.json').then((r) => r.json());
    performance.mark('start-push-payload');
    this.store.push(payload);
    performance.mark('start-materialization');
    this.store.peekAll('child').slice();
    this.store.peekAll('parent').slice();

    performance.mark('start-unload-all');
    this.store.unloadAll();
    performance.mark('end-unload-all');
  },
});
