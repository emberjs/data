import { watch } from 'node:fs';

export function addCloseHandler(state: { closeHandlers: Array<() => void> }, cb: () => void) {
  state.closeHandlers.push(createCloseHandler(cb));
}

function createCloseHandler(cb: () => void) {
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

export function watchAssets(
  state: { closeHandlers: Array<() => void> },
  directory: string,
  onAssetChange: (event: string, filename: string | null) => void
) {
  const watcher = watch(directory, { recursive: true }, (event, filename) => {
    onAssetChange(event, filename);
  });

  addCloseHandler(state, () => {
    watcher.close();
  });
}
