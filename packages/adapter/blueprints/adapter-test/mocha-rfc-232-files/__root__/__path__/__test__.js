import { expect } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '<%= modulePrefix %>/tests/helpers';

describe('<%= friendlyTestDescription %>', function () {
  setupTest();

  // Replace this with your real tests.
  it('exists', function () {
    let adapter = this.owner.lookup('adapter:<%= dasherizedModuleName %>');
    expect(adapter).to.be.ok;
  });
});
