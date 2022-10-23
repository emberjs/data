import { expect } from 'chai';
import { setupTest } from 'dummy/tests/helpers';
import { describe, it } from 'mocha';

describe('Unit | Model | foo', function () {
  setupTest();

  // Replace this with your real tests.
  it('exists', function () {
    let store = this.owner.lookup('service:store');
    let model = store.createRecord('foo', {});
    expect(model).to.be.ok;
  });
});
