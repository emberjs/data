import { watch } from 'fs';

export function addCloseHandler(cb) {
  let executed = false;

  process.on('SIGINT', () => {
    if (executed) return;
    executed = true;
    cb();
  });

  process.on('SIGTERM', () => {
    if (executed) return;
    executed = true;
    cb();
  });

  process.on('SIGQUIT', () => {
    if (executed) return;
    executed = true;
    cb();
  });

  process.on('exit', () => {
    if (executed) return;
    executed = true;
    cb();
  });
}

export function watchAssets(directory, onAssetChange) {
  const watcher = watch(directory, { recursive: true }, (event, filename) => {
    onAssetChange(event, filename);
  });

  addCloseHandler(() => {
    watcher.close();
  });
}
