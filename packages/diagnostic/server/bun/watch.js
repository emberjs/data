import { watch } from 'fs';
import { debug } from '../utils/debug.js';
export function addCloseHandler(cb, options) {
  let executed = false;
  const exit = options?.exit
    ? (signal) => {
        debug(`Exiting with signal ${signal} in CloseHandler for ${options.label ?? '<unknown>'}`);
        const code = typeof signal === 'number' ? signal : 1;
        // eslint-disable-next-line n/no-process-exit
        process.exit(code);
      }
    : (signal) => {
        debug(`Ignoring signal ${signal} in CloseHandler for ${options.label ?? '<unknown>'}`);
      };

  process.on('SIGINT', (signal) => {
    debug(`CloseHandler for ${options.label ?? '<unknown>'} Received SIGINT`);
    if (executed) return exit(signal);
    debug('Executing Close Handler for SIGINT');
    executed = true;
    cb();
    exit(signal);
  });

  process.on('SIGTERM', (signal) => {
    debug(`CloseHandler for ${options.label ?? '<unknown>'} Received SIGTERM`);
    if (executed) return exit(signal);
    debug('Executing Close Handler for SIGTERM');
    executed = true;
    cb();
    exit(signal);
  });

  process.on('SIGQUIT', (signal) => {
    debug(`CloseHandler for ${options.label ?? '<unknown>'} Received SIGQUIT`);
    if (executed) return exit(signal);
    debug('Executing Close Handler for SIGQUIT');
    executed = true;
    cb();
    exit(signal);
  });

  process.on('exit', (signal) => {
    debug(`CloseHandler for ${options.label ?? '<unknown>'} Received exit`);
    if (executed) return exit(signal);
    debug('Executing Close Handler for exit');
    executed = true;
    cb();
    exit(signal);
  });
}

export function watchAssets(directory, onAssetChange) {
  const watcher = watch(directory, { recursive: true }, (event, filename) => {
    onAssetChange(event, filename);
  });

  addCloseHandler(
    () => {
      watcher.close();
    },
    {
      label: 'watchAssets',
      exit: false,
    }
  );
}
