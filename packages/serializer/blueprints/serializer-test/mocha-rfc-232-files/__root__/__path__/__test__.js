import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('<%= friendlyTestDescription %>', function() {
  setupTest();

  // Replace this with your real tests.
  it('exists', function() {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('<%= dasherizedModuleName %>');

    expect(serializer).to.be.ok;
  });

  it('serializes records', function() {
    let store = this.owner.lookup('service:store');
    let record = store.createRecord('<%= dasherizedModuleName %>', {});

    let serializedRecord = record.serialize();

    expect(serializedRecord).to.be.ok;
  });
});
