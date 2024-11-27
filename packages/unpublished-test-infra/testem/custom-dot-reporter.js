/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */
const fs = require('node:fs');
const path = require('node:path');

const DotReporter = require('testem/lib/reporters/dot_reporter');
const chalk = require('chalk');

const SLOW_TEST_COUNT = 50;
const JSON_INDENT = 2;
const DEFAULT_TIMEOUT = 8_000;
const TIMEOUT_BUFFER = 0;
const DEFAULT_TEST_TIMEOUT = 21_000;

function indent(text, width = 2) {
  return text
    .split('\n')
    .map((line) => {
      return new Array(width).join('\t') + line;
    })
    .join('\n');
}

class CustomDotReporter extends DotReporter {
  allData = [];
  failedTests = [];
  hasMemoryData = false;
  partitions = {};
  partitionsMap = {};
  _running = {};
  totalLines = 0;
  lineFailures = [];

  reportFinalMemoryStats() {
    this.out.write(
      `\n\n\t==================================\n\tBrowser Memory Usage Stats\n\t==================================\n`
    );
    this.out.write(`\tBrowser\t\t| Tests\t| Delta\t\t| {startMetrics}\t\t| {endMetrics}\t\t\t|\n`);
    const keys = Object.keys(this.partitions);
    keys.sort();
    keys.forEach((key) => {
      const value = this.partitions[key];

      const start = value.find((v) => v.originalResultObj?.memoryUsage);
      const end = value.findLast((v) => v.originalResultObj?.memoryUsage);
      const a = end?.originalResultObj.memoryUsage.usedJSHeapSize || 0;
      const b = start?.originalResultObj.memoryUsage.usedJSHeapSize || 0;

      const delta = Math.round(((a - b) / 1024 / 1024) * 100) / 100;
      this.out.write(
        `\t${key}\t| ${value.length}\t| ${delta}\t| ${formatBytes(
          start?.originalResultObj.memoryUsage || 0
        )}\t| ${formatBytes(end?.originalResultObj.memoryUsage || 0)}|\n`
      );
    });
    this.out.write(`\t==================================\n\n`);

    keys.forEach((key) => {
      this.out.write(`\n\n`);
      const value = this.partitions[key];
      value.forEach((data) => {
        if (!data.originalResultObj?.memoryUsage) {
          if (!data.skipped && !data.todo) {
            this.out.write(`${data.runDuration}ms MemoryUNK ${data.name}\n`);
          }
        } else {
          this.out.write(`${data.runDuration}ms ${data.name}\n`);
        }
      });
      this.out.write(`\n\n`);
    });

    this.out.write(`\n\n`);
  }

  reportPendingTests() {
    const getBrowserId = (v) => {
      return this.partitionsMap[v.launcherId] || v.launcherId;
    };

    const values = Object.values(this._running).sort((a, b) => {
      return getBrowserId(a) > getBrowserId(b) ? -1 : 1;
    });
    if (values.length) {
      this.out.write(chalk.red(`\n\nStill Pending Tests:\n\n`));
      values.forEach((v) => {
        this.out.write(chalk.yellow(`\t⛔️ Stuck: ${getBrowserId(v)} #${v.id} - ${chalk.white(v.name)}\n`));
      });
    }
  }

  reportSlowTests() {
    const data = this.allData;
    let totalDuration = 0;
    let testsToPrint = SLOW_TEST_COUNT;
    data.sort((a, b) => {
      return a.runDuration > b.runDuration ? -1 : 1;
    });

    this.out.write(
      `\n\n======================================\n\t${chalk.yellow(
        `${data.length < SLOW_TEST_COUNT ? data.length : SLOW_TEST_COUNT} Longest Running Tests`
      )}\n======================================\n`
    );
    for (let i = 0; i < data.length; i++) {
      const { name, runDuration } = data[i];

      if (i < testsToPrint) {
        // this test is a known offender
        if (runDuration > DEFAULT_TIMEOUT + TIMEOUT_BUFFER) {
          this.out.write(`\n\t${i + 1}.\t[S] ${chalk.yellow(runDuration.toLocaleString('en-US') + 'ms')}\t${name}`);
          testsToPrint++;
        } else {
          this.out.write(`\n\t${i + 1}.\t${chalk.yellow(runDuration.toLocaleString('en-US') + 'ms')}\t${name}`);
        }
      }
      totalDuration += runDuration;
    }
    this.out.write(
      chalk.yellow(`\n\n\tAvg Duration of all ${data.length} tests: ${Math.round(totalDuration / data.length)}ms\n\n`)
    );
  }

  reportFailedTests() {
    this.failedTests.forEach((failure) => printFailure(this.out, failure));
    const failedTestIds = [];
    let allFailuresAccounted = true;
    this.failedTests.forEach((failure) => {
      if (failure.originalResultObj?.testId && !failure.error?.message?.includes('No tests matched the testId')) {
        failedTestIds.push(failure.originalResultObj.testId);
      } else {
        allFailuresAccounted = false;
      }
    });

    const cacheFile = path.join(__dirname, '../failed-test-log.txt');
    if (allFailuresAccounted) {
      if (failedTestIds.length) {
        fs.writeFileSync(cacheFile, failedTestIds.join(','), { encoding: 'utf-8' });
        this.out.write(
          chalk.yellow(
            `\n\nSaved ${chalk.white(failedTestIds.length)} Failed Tests for Retry with IDS ${chalk.white(
              failedTestIds.join(',')
            )} in ${chalk.grey(cacheFile)}`
          )
        );
        this.out.write(
          `\n\nTo run failed tests locally, visit http://localhost:7357/tests/index.html?${failedTestIds
            .map((id) => `testId=${id}`)
            .join('&')}`
        );
      } else {
        remove(cacheFile);
      }
    } else {
      this.out.write(
        chalk.red(`\n\n⚠️ Unable to save failed tests for retry, not all failures had test IDs, cleaning up`)
      );
      remove(cacheFile);
    }
  }

  reportDeprecations() {
    if (process.env.ASSERT_ALL_DEPRECATIONS === 'true') {
      this.out.write('\n============ Deprecations ============\n');
      this.out.write(JSON.stringify(this.deprecations, null, JSON_INDENT) + '\n');
      this.out.write('======================================\n');
    }
  }

  /**
   * Runs on Test Suite Completion
   */
  finish() {
    this.endTime = new Date();

    if (this.hasMemoryData) {
      this.reportFinalMemoryStats();
    }

    if (this.failedTests.length) {
      this.out.write(
        chalk.red(
          `\n\n${this.failedTests.length} Tests Failed. Complete stack traces for failures will print at the end.`
        )
      );
    }

    this.reportPendingTests();

    this.out.write(`\n\n\n----------\n\n\n`);

    this.reportSlowTests();
    this.reportFailedTests();

    this.out.write('\n\n');
    this.out.write(this.summaryDisplay());
    this.out.write('\n\n');

    this.reportDeprecations();
  }

  displayFullResult(prefix, result) {
    if (this.silent) {
      return;
    }
    if (result.passed && !result.todo) {
      this.out.write(
        `\t✅ ${chalk.green('Passed')}: ${chalk.white(`#${result.__testNo}`)} ${chalk.grey(
          result.runDuration.toLocaleString('en-US') + 'ms'
        )} ${result.name}\n`
      );
    } else if (!result.passed && result.todo) {
      this.out.write(
        chalk.cyan(
          `\t🛠️ TODO: ${chalk.white(`#${result.__testNo}`)} ${chalk.grey(
            result.runDuration.toLocaleString('en-US') + 'ms'
          )} ${result.name}\n`
        )
      );
    } else if (result.skipped) {
      this.out.write(
        chalk.yellow(
          `\t⚠️ Skipped: ${chalk.white(`#${result.__testNo}`)} ${chalk.grey(
            result.runDuration.toLocaleString('en-US') + 'ms'
          )} ${result.name}\n`
        )
      );
    } else {
      this.out.write(
        chalk.red(
          `\t💥 Failed: ${chalk.white(`#${result.__testNo}`)} ${chalk.grey(
            result.runDuration.toLocaleString('en-US') + 'ms'
          )} ${result.name}\n`
        )
      );
      this.out.write(
        `\t\topen test locally: http://localhost:7357/tests/index.html?testId=${result.originalResultObj?.testId}\n`
      );
    }
  }

  display(prefix, result) {
    if (this.silent) {
      return;
    }
    if (this.currentLineChars > this.maxLineChars) {
      this.totalLines++;
      this.currentLineChars = 0;
      const lineFailures = this.lineFailures;
      this.lineFailures = [];

      if (lineFailures.length) {
        this.out.write('\n\n');
        lineFailures.forEach((failure) => {
          this.displayFullResult(null, failure);
        });
      }

      if (this.totalLines % 5 === 0) {
        this.out.write(`\n${chalk.magenta((this.totalLines * this.maxLineChars).toLocaleString('en-US'))}⎡\t`);
      } else {
        this.out.write('\n\t');
      }
    }
    if (result.passed && !result.todo) {
      this.out.write(chalk.grey('.'));
    } else if (!result.passed && result.todo) {
      this.out.write(chalk.cyan('T'));
    } else if (result.skipped) {
      this.out.write(chalk.yellow('*'));
    } else {
      this.out.write(chalk.bold(chalk.red('F')));
    }
    this.currentLineChars += 1;
  }

  /**
   * Runs on Individual Test Completion
   */
  report(prefix, data) {
    data.__testNo = this.allData.length + 1;
    data.launcher = prefix;
    data.runDuration = data.runDuration || 0;
    if (data.launcherId && this._running[data.launcherId]?.id === data.originalResultObj?.id) {
      delete this._running[data.launcherId];
    }

    addTestMetaToName(this.partitions, this.partitionsMap, data);

    if (data.originalResultObj?.memoryUsage) {
      this.hasMemoryData = true;
    }

    if (process.env.DISPLAY_TEST_NAMES) {
      this.displayFullResult(prefix, data);
    } else {
      if (this.allData.length === 0) {
        this.displayDotLegend();
      }
      this.display(prefix, data);
    }

    this.total++;
    if (data.skipped) {
      this.skipped++;
    } else if (data.passed && !data.todo) {
      this.pass++;
    } else if (!data.passed && data.todo) {
      this.todo++;
    }

    this.allData.push(data);
    if (data.failed && !data.skipped && !data.todo) {
      this.lineFailures.push(data);
      this.failedTests.push(data);
    }
  }

  displayDotLegend() {
    this.out.write('\n\tLegend\n\t=========');
    this.out.write(chalk.green('\n\tPass:\t.'));
    this.out.write(chalk.cyan('\n\tTodo:\tT'));
    this.out.write(chalk.yellow('\n\tSkip:\t*'));
    this.out.write(chalk.bold(chalk.red('\n\tFail:\tF')));
    this.out.write('\n\n\t');
  }

  /**
   * runs on individual test start
   * only because we patch testem to emit this.
   * Normally it will not alert us to test start even
   * though it knows.
   */
  testStarted(_browserName, data) {
    data._testStarted = Date.now();
    this._running[data.launcherId] = data;
    this.ensureTimeoutCheck();
  }

  /**
   * Periodically checks for hung tests and reports them
   */
  ensureTimeoutCheck() {
    if (this._timeoutId) {
      return;
    }
    this._timeoutId = setTimeout(() => {
      Object.keys(this._running).forEach((key) => {
        const data = this._running[key];
        const duration = Date.now() - data._testStarted;
        if (duration > DEFAULT_TEST_TIMEOUT) {
          this.out.write(
            chalk.grey(
              `\n\n⚠️  ${chalk.yellow('Pending:')} ${chalk.white(data.name)} has been running for ${chalk.yellow(
                duration.toLocaleString('en-US') + 'ms'
              )}, this is likely a bug.\n`
            )
          );
        }
      });
      this._timeoutId = null;
      if (Object.keys(this._running).length) {
        this.ensureTimeoutCheck();
      }
    }, DEFAULT_TEST_TIMEOUT / 3);
  }

  reportMetadata(tag, metadata) {
    if (tag === 'deprecations') {
      this.deprecations = metadata;
    }
  }

  summaryDisplay() {
    const lines = [chalk.yellow(`[duration - ${this.duration()} ms]`), summaryDisplay(this)];
    return lines.join('\n');
  }
}

function formatBytes({ jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize, granular }) {
  if (granular) {
    console.log({ granular });
    throw new Error(`Granular Memory Data Access Detected! (This is Awesome, Alert @runspired)`);
  }
  const used = Math.round((usedJSHeapSize / 1024 / 1024) * 100) / 100;
  const total = Math.round((totalJSHeapSize / 1024 / 1024) * 100) / 100;
  const max = Math.round((jsHeapSizeLimit / 1024 / 1024) * 100) / 100;
  return `{${used}/${total}/${max} Mb} `;
}

function addTestMetaToName(partitions, partitionsMap, result) {
  if (!result.originalResultObj && result.error?.message !== 'Received SIGINT signal') {
    if (result.logs?.[0]?.text.includes('Browser failed to connect')) {
      result.logs.forEach((log) => {
        if (typeof log?.text === 'string') {
          log.text.split('\n').forEach((line) => {
            console.log(line);
          });
        } else {
          console.log(log);
        }
      });
    }
  }
  const bytes =
    !result.skipped && !result.todo && result.originalResultObj?.memoryUsage
      ? formatBytes(result.originalResultObj.memoryUsage)
      : '';
  //const index = result.name.indexOf('-');
  const remainder = result.name; //result.name.substring(index);
  const start = ''; //result.name.substring(0, index - 1);
  result.name = `${bytes}${start} #${result.originalResultObj?.id || '??'} ${remainder}`;
  partitions[start] = partitions[start] || [];
  partitionsMap[start] = result.launcherId;
  partitionsMap[result.launcherId] = start;
  partitions[start].push(result);
}

function printFailure(out, result) {
  console.log(JSON.stringify(result, null, 2));
  out.write(chalk.red(`\n\t💥 Failed: ${result.runDuration.toLocaleString('en-US')}ms ${result.name}\n`));
  const error = result.error;

  if (!error) {
    // we aren't totally sure what to do in these situations yet
    // so lets not be lossy around the info that might be helpful :)
    console.log(result);
    return;
  }

  if (error.message) {
    out.write(`\t\t${error.message}\n`);
  }

  if ('expected' in error && 'actual' in error) {
    out.write(`\n\t\texpected: ${error.negative ? 'NOT ' : ''}${error.expected}\n\t\tactual: ${error.actual}\n`);
  }

  if (error.stack) {
    out.write(`\n${indent(error.stack)}`);
  }

  out.write('\n\n');
}

// Instead of completely removing, we replace the contents with an empty string so that CI will still cache it.
// While this shouldn't ever really be necessary it's a bit more correct to make sure that the log gets cleared
// in the cache as well.
function remove(filePath) {
  fs.writeFileSync(filePath, '', { encoding: 'utf-8' });
}

function summaryDisplay(reporter) {
  const lines = [
    'Total ' + reporter.total,
    chalk.green('# pass  ' + reporter.pass),
    chalk.yellow('# skip  ' + reporter.skipped),
    chalk.cyan('# todo  ' + reporter.todo),
    chalk.red('# fail  ' + (reporter.total - reporter.pass - reporter.skipped - reporter.todo)),
  ];

  if (this.pass + this.skipped + this.todo === this.total) {
    lines.push('');
    lines.push('# ok');
  }
  return lines.join('\n');
}

module.exports = CustomDotReporter;
