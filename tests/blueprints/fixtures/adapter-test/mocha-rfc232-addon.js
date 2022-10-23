import { expect } from 'chai';
import { setupTest } from 'dummy/tests/helpers';
import { describe, it } from 'mocha';

describe('Unit | Adapter | foo', function () {
  setupTest();

  // Replace this with your real tests.
  it('exists', function () {
    let adapter = this.owner.lookup('adapter:foo');
    expect(adapter).to.be.ok;
  });
});
