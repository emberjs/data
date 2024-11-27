export function sinceStart() {
  const time = performance.now();
  const seconds = Math.floor(time / 1000);
  const minutes = Math.floor(seconds / 60);
  const ms = Math.floor(time % 1000);

  if (minutes) {
    return `${minutes.toLocaleString('en-US')}m ${seconds % 60}s ${ms.toLocaleString('en-US')}ms`;
  }

  if (seconds) {
    return `${seconds}s ${ms.toLocaleString('en-US')}ms`;
  }

  return `${ms.toLocaleString('en-US')}ms`;
}
