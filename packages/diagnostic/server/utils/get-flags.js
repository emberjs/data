export function getFlags() {
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const rawArg = raw[i];
    if (rawArg.startsWith('--')) {
      continue;
    } else if (rawArg.startsWith('-')) {
      const args = rawArg.slice(1);
      if (args.length > 1) {
        for (let j = 0; j < args.length; j++) {
          raw.push(`-${args[j]}`);
        }
      }
    }
  }
  const flags = new Set(raw);
  const filtered = {};

  // global flags
  const debug = flags.has('--debug') || flags.has('-d');
  const serve = flags.has('--serve') || flags.has('-s');
  const noLaunch = flags.has('--no-launch') || flags.has('-n');
  const filter = flags.has('--filter') || flags.has('-f');
  const retry = flags.has('--retry') || flags.has('-r');
  const headless = flags.has('--headless') || flags.has('-h');
  const useExisting = flags.has('--use-existing') || flags.has('-e');

  if (filter) {
    filtered['filter'] = true;
  }
  if (debug) {
    filtered['debug'] = true;
  }
  if (serve) {
    filtered['serve'] = true;
  }
  if (noLaunch) {
    filtered['noLaunch'] = true;
  }
  if (retry) {
    filtered['retry'] = true;
  }
  if (headless) {
    filtered['headless'] = true;
  }
  if (useExisting) {
    filtered['useExisting'] = true;
  }

  return {
    parsed: {
      debug,
      serve,
      noLaunch,
      filter,
      retry,
      headless,
      useExisting,
    },
    filtered,
    flags,
  };
}
