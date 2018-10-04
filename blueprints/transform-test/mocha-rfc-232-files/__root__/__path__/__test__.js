import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('<%= friendlyTestDescription %>', function() {
  setupTest();

  // Replace this with your real tests.
  it('exists', function() {
    let transform = this.owner.lookup('transform:<%= dasherizedModuleName %>');
    expect(transform).to.be.ok;
  });
});
