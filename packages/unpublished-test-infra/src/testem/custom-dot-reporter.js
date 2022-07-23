let DotReporter = require('testem/lib/reporters/dot_reporter');

class CustomDotReporter extends DotReporter {
  allData = [];

  finish() {
    const data = this.allData;
    let totalDuration = 0;
    data.sort((a, b) => {
      return a.runDuration > b.runDuration ? -1 : 1;
    });

    this.out.write(`\n\n50 Longest Running Tests\n`);
    for (let i = 0; i < data.length; i++) {
      const { name, runDuration } = data[i];

      if (i < 50) {
        this.out.write(`\n\t${i + 1}.\t${runDuration}ms\t${name}`);
      }
      totalDuration += runDuration;
    }
    this.out.write(`\n\n\tAvg Duration of all ${data.length} tests: ${Math.round(totalDuration / data.length)}ms\n\n`);

    super.finish();

    if (process.env.ASSERT_ALL_DEPRECATIONS === 'true') {
      this.out.write('\n============ Deprecations ============\n');
      this.out.write(JSON.stringify(this.deprecations, null, 2) + '\n');
      this.out.write('======================================\n');
    }
  }

  report(prefix, data) {
    super.report(prefix, data);
    data.runDuration = data.runDuration || 0;
    this.allData.push(data);
  }

  reportMetadata(tag, metadata) {
    if (tag === 'deprecations') {
      this.deprecations = metadata;
    }
  }
}

module.exports = CustomDotReporter;
