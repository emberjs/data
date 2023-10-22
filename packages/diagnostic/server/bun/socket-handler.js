import chalk from 'chalk';

import { debug, info } from '../utils/debug.js';
import { sinceStart } from '../utils/time.js';

export function buildHandler(config, state) {
  return {
    perMessageDeflate: true,
    async message(ws, message) {
      const msg = JSON.parse(message);
      msg.launcher = state.browsers.get(msg.browserId).launcher;
      info(`${chalk.green('➡')} [${chalk.cyan(msg.browserId)}/${chalk.cyan(msg.windowId)}] ${chalk.green(msg.name)}`);

      switch (msg.name) {
        case 'suite-start':
          if (!state.started) {
            state.started = true;
            config.reporter.onRunStart(msg);
          }
          config.reporter.onSuiteStart(msg);
          break;
        case 'test-start':
          config.reporter.onTestStart(msg);
          break;
        case 'test-finish':
          config.reporter.onTestFinish(msg);
          break;
        case 'suite-finish':
          config.reporter.onSuiteFinish(msg);

          ws.send(JSON.stringify({ name: 'close' }));
          ws.close();
          state.completed++;
          debug(
            `${chalk.green('✅ [Complete]')} ${chalk.cyan(msg.browserId)}/${chalk.cyan(msg.windowId)} ${chalk.yellow(
              '@' + sinceStart()
            )}`
          );
          if (state.completed === state.expected) {
            const exitCode = config.reporter.onRunFinish(msg);
            debug(`${chalk.green('✅ [All Complete]')} ${chalk.yellow('@' + sinceStart())}`);
            state.browsers.forEach((browser) => {
              browser.proc.kill();
              browser.proc.unref();
            });
            state.server.stop();
            if (config.cleanup) {
              debug(`Running configured cleanup hook`);
              await config.cleanup();
              debug(`Configured cleanup hook completed`);
            }
            process.exit(exitCode);
          }

          break;
      }
      // console.log(JSON.parse(message));
    }, // a message is received
    open(ws) {}, // a socket is opened
    close(ws, code, message) {}, // a socket is closed
    drain(ws) {}, // the socket is ready to receive more data
  };
}
