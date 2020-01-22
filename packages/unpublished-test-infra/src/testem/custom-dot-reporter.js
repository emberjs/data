let DotReporter = require('testem/lib/reporters/dot_reporter');

class CustomDotReporter extends DotReporter {
  finish() {
    super.finish();

    if (process.env.ASSERT_ALL_DEPRECATIONS === 'true') {
      this.out.write('\n============ Deprecations ============\n');
      this.out.write(JSON.stringify(this.deprecations, null, 2) + '\n');
      this.out.write('======================================\n');
    }
  }

  reportMetadata(tag, metadata) {
    if (tag === 'deprecations') {
      this.deprecations = metadata;
    }
  }
}

module.exports = CustomDotReporter;
