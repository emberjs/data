import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class extends Route {
  @service store;

  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/complex-record-materialization.json').then((r) => r.json());
    performance.mark('start-push-payload');
    this.store._push(payload);
    performance.mark('start-peek-records');
    const complexRecordsA = this.store.peekAll('complex-record-a');
    const complexRecordsB = this.store.peekAll('complex-record-b');
    const complexRecordsC = this.store.peekAll('complex-record-c');
    const complexRecordsD = this.store.peekAll('complex-record-d');
    const complexRecordsE = this.store.peekAll('complex-record-e');
    const complexRecordsF = this.store.peekAll('complex-record-f');
    const complexRecordsG = this.store.peekAll('complex-record-g');
    const complexRecordsH = this.store.peekAll('complex-record-h');
    const complexRecordsI = this.store.peekAll('complex-record-i');
    const complexRecordsJ = this.store.peekAll('complex-record-j');
    performance.mark('start-record-materialization');
    complexRecordsA.slice();
    complexRecordsB.slice();
    complexRecordsC.slice();
    complexRecordsD.slice();
    complexRecordsE.slice();
    complexRecordsF.slice();
    complexRecordsG.slice();
    complexRecordsH.slice();
    complexRecordsI.slice();
    complexRecordsJ.slice();
    performance.mark('end-record-materialization');
  }
}
