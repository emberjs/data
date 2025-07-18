import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class extends Route {
  @service store;

  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/complex-record-materialization.json').then((r) => r.json());
    performance.mark('start-push-payload');
    this.store._push(payload, true);
    performance.mark('start-flush-notifications');
    this.store.notifications._flush();
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
    const records = new Map([
      ['complex-record-a', complexRecordsA.slice()],
      ['complex-record-b', complexRecordsB.slice()],
      ['complex-record-c', complexRecordsC.slice()],
      ['complex-record-d', complexRecordsD.slice()],
      ['complex-record-e', complexRecordsE.slice()],
      ['complex-record-f', complexRecordsF.slice()],
      ['complex-record-g', complexRecordsG.slice()],
      ['complex-record-h', complexRecordsH.slice()],
      ['complex-record-i', complexRecordsI.slice()],
      ['complex-record-j', complexRecordsJ.slice()],
    ]);
    performance.mark('start-field-access');

    for (const [type, recordsOfType] of records) {
      const fields = this.store.schema.fields({ type });
      for (const record of recordsOfType) {
        for (const field of fields) {
          if (field.kind === 'attribute') {
            record[field];
          }
        }
      }
    }

    performance.mark('start-relationship-access');

    for (const [type, recordsOfType] of records) {
      const fields = this.store.schema.fields({ type });
      for (const record of recordsOfType) {
        for (const field of fields) {
          if (field.kind === 'belongsTo') {
            record[field];
          } else if (field.kind === 'hasMany') {
            record[field].length;
          }
        }
      }
    }

    performance.mark('end-relationship-access');
  }
}
