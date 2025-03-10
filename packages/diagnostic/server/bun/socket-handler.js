import chalk from 'chalk';

import { debug, info } from '../utils/debug.js';
import { sinceStart } from '../utils/time.js';
import { watchAssets } from './watch.js';

export function buildHandler(config, state) {
  const Connections = new Set();
  if (config.serve && !config.noWatch) {
    watchAssets(state, config.assets, () => {
      Connections.forEach((ws) => {
        ws.send(JSON.stringify({ name: 'reload' }));
      });
    });
  }

  return {
    perMessageDeflate: true,
    async message(ws, message) {
      const msg = JSON.parse(message);
      msg.launcher = state.browsers.get(msg.browserId)?.launcher ?? '<unknown>';

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

          if (!config.serve) {
            ws.send(JSON.stringify({ name: 'close' }));
            ws.close();
          }
          state.completed++;
          debug(
            `${chalk.green('✅ [Complete]')} ${chalk.cyan(msg.browserId)}/${chalk.cyan(msg.windowId)} ${chalk.yellow(
              '@' + sinceStart()
            )}`
          );
          if (state.completed === state.expected) {
            const exitCode = config.reporter.onRunFinish(msg);
            debug(`${chalk.green('✅ [All Complete]')} ${chalk.yellow('@' + sinceStart())}`);

            if (!config.serve) {
              await state.safeCleanup();
              debug(`\n\nExiting with code ${exitCode}`);
              // 1. We expect all cleanup to have happened after
              //    config.cleanup(), so exiting here should be safe.
              // 2. We also want to forcibly exit with a success code in this
              //    case.
              // eslint-disable-next-line n/no-process-exit
              process.exit(exitCode);
            } else {
              state.completed = 0;
            }
          } else {
            console.log(`Waiting for ${state.expected - state.completed} more browsers to finish`);
          }

          break;
      }
      // console.log(JSON.parse(message));
    }, // a message is received
    open(ws) {
      Connections.add(ws);
      debug(`WebSocket opened`);
    }, // a socket is opened
    close(ws, code, message) {
      Connections.delete(ws);
      debug(`WebSocket closed`);
    }, // a socket is closed
    drain(ws) {}, // the socket is ready to receive more data
  };
}
