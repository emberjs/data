import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('<%= friendlyTestDescription %>', function() {
  setupTest();

  // Replace this with your real tests.
  it('exists', function() {
    let store = this.owner.lookup('service:store');
    let model = store.createRecord('<%= dasherizedModuleName %>', {});
    expect(model).to.be.ok;
  });
});
