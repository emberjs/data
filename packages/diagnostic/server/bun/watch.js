import { watch } from 'fs';

export function addCloseHandler(state, cb) {
  state.closeHandlers.push(createCloseHandler(cb));
}

function createCloseHandler(cb) {
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

  return () => {
    if (executed) return;
    executed = true;
    cb();
  };
}

export function watchAssets(state, directory, onAssetChange) {
  const watcher = watch(directory, { recursive: true }, (event, filename) => {
    onAssetChange(event, filename);
  });

  addCloseHandler(state, () => {
    watcher.close();
  });
}
