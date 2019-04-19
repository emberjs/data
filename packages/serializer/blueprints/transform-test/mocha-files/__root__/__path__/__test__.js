import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('<%= friendlyTestDescription %>', function() {
  setupTest('transform:<%= dasherizedModuleName %>', {
    // Specify the other units that are required for this test.
    // needs: ['transform:foo']
  });

  // Replace this with your real tests.
  it('exists', function() {
    let transform = this.subject();
    expect(transform).to.be.ok;
  });
});
