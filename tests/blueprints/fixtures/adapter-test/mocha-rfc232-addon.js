import { expect } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from 'dummy/tests/helpers';

describe('Unit | Adapter | foo', function () {
  setupTest();

  // Replace this with your real tests.
  it('exists', function () {
    let adapter = this.owner.lookup('adapter:foo');
    expect(adapter).to.be.ok;
  });
});
