/*eslint-env mocha */
const assert = require('assert');

const determineNextAlpha = require('./next-alpha-util');

// mocha bin/determine-next-alpha-version/next-alpha-util-test.js
describe('next-alpha-util', function() {
  describe('#determineNextAlpha()', function() {
    it('existing alpha should return next prerelease', function() {
      const versions = ['3.27.0-alpha.0', '3.27.0-beta.0', '3.28.0-alpha.4'];
      assert.strictEqual(determineNextAlpha(versions), '3.28.0-alpha.5');
    });
    it('existing beta with no alpha should return first prerelease for alpha', function() {
      const versions = ['3.27.0-alpha.0', '3.27.0-beta.0', '3.29.0-beta.0'];
      assert.strictEqual(determineNextAlpha(versions), '3.29.0-alpha.0');
    });
    it('if latest is just release, then next minor version alpha', function() {
      const versions = ['3.26.0', '3.27.0-alpha.0', '3.27.0'];
      assert.strictEqual(determineNextAlpha(versions), '3.28.0-alpha.0');
    });
    it('machine release for alpha and beta should increment alpha ', function() {
      const versions = ['3.28.0', '3.29.0-alpha.2', '3.29.0-beta.0'];
      assert.strictEqual(determineNextAlpha(versions), '3.29.0-alpha.3');
    });
  });
});
