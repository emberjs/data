import { expect } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from 'dummy/tests/helpers';

describe('Unit | Transform | foo', function () {
  setupTest();

  // Replace this with your real tests.
  it('exists', function () {
    let transform = this.owner.lookup('transform:foo');
    expect(transform).to.be.ok;
  });
});
