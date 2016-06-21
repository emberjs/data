import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';

describeModel(
  '<%= dasherizedModuleName %>',
  '<%= friendlyDescription %>',
  {
    // Specify the other units that are required for this test.
    <%= typeof needs !== 'undefined' ? needs : '' %>
  },
  function() {
    // Replace this with your real tests.
    it('exists', function() {
      let model = this.subject();
      // var store = this.store();
      expect(model).to.be.ok;
    });
  }
);
