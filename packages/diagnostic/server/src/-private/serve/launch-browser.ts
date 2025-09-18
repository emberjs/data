/* eslint-disable @typescript-eslint/require-await */
import chalk from 'chalk';
import { spawn } from 'node:child_process';

import type { LaunchState } from '../../index.ts';
import type { LaunchConfig } from '../default-setup.ts';
import { info, print } from '../utils/debug.ts';

export async function launchBrowsers(config: LaunchConfig, state: LaunchState) {
  const launcherNames = Object.keys(config.launchers ?? {}) as Array<keyof typeof config.launchers>;
  if (launcherNames.length === 0) {
    throw new Error(`No launchers configured`);
  }

  const parallel = config.parallel ?? 1;
  for (const launcherName of launcherNames) {
    const launcher = config.launchers[launcherName]!;

    if (!launcher.command) {
      throw new Error(`Missing command for launcher ${launcherName}`);
    }

    const args = launcher.args?.slice() ?? [];
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
    const browser = spawn(launcher.command, args, {
      env: process.env,
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    state.browsers.set(String(bId), {
      launcher: launcherName,
      proc: browser,
    });
    info(`${launcherName} spawned with pid ${browser.pid}`);
    print(chalk.magenta(`⚛️  Launched ${launcherName}`));
  }
}
