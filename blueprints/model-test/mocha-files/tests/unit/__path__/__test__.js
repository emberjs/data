import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupModelTest } from 'ember-mocha';

describe('<%= friendlyDescription %>', function() {
  setupModelTest('<%= dasherizedModuleName %>', {
    // Specify the other units that are required for this test.
    <%= typeof needs !== 'undefined' ? needs : '' %>
  });

  // Replace this with your real tests.
  it('exists', function() {
    let model = this.subject();
    // var store = this.store();
    expect(model).to.be.ok;
  });
});
