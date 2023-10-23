import chalk from 'chalk';

import { info, print } from '../utils/debug.js';

/** @type {import('bun-types')} */

export async function launchBrowsers(config, state) {
  const launchers = Object.keys(config.launchers ?? {});
  if (launchers.length === 0) {
    throw new Error(`No launchers configured`);
  }

  const parallel = config.parallel ?? 1;
  for (const launcher of launchers) {
    if (!config.launchers[launcher].command) {
      throw new Error(`Missing command for launcher ${launcher}`);
    }

    const args = config.launchers.chrome.args ?? [];
    args.unshift(config.launchers.chrome.command);
    const bId = state.browserId++;

    if (parallel > 1) {
      const pages = [];
      for (let i = 0; i < parallel; i++) {
        pages.push(`?b=${bId}&w=${state.windowId++}`);
      }

      const launcherUrl = `${state.protocol}://${state.hostname}:${state.port}/parallel-launcher?p[]=${pages.join(
        '&p[]='
      )}`;
      args.push(launcherUrl);
    } else {
      args.push(`${state.protocol}://${state.hostname}:${state.port}?b=${bId}&w=${state.windowId++}`);
    }

    info(`Spawning:\n\t${args.join('\n\t\t')}`);
    const browser = Bun.spawn(args, {
      env: process.env,
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
    });
    state.browsers.set(String(bId), {
      launcher,
      proc: browser,
    });
    info(`${launcher} spawned with pid ${browser.pid}`);
    print(chalk.magenta(`⚛️  Launched ${launcher}`));
  }
}
