import { expect } from 'chai';
import { setupTest } from 'dummy/tests/helpers';
import { describe, it } from 'mocha';

describe('Unit | Transform | foo', function () {
  setupTest();

  // Replace this with your real tests.
  it('exists', function () {
    let transform = this.owner.lookup('transform:foo');
    expect(transform).to.be.ok;
  });
});
