import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';

describeModule(
  'transform:<%= dasherizedModuleName %>',
  '<%= friendlyTestDescription %>',
  {
    // Specify the other units that are required for this test.
    // needs: ['transform:foo']
  },
  function() {
    // Replace this with your real tests.
    it('exists', function() {
      let transform = this.subject();
      expect(transform).to.be.ok;
    });
  }
);
