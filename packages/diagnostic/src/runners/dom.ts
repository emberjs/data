import { registerReporter, start as _start } from '../';
import type { Emitter } from '../-types';
import { assert, getGlobal } from '../-utils';
import type { ConfigOptions} from '../internals/config';
import { configure, getSettings } from '../internals/config';
import { DOMReporter } from '../reporters/dom';

export async function start(config?: ConfigOptions) {
  if (config) {
    configure(config);
  }

  const context = getGlobal();
  const body = context.document?.body;

  assert(`Expected to be in a browser environment`, typeof body !== 'undefined');

  const container = context.document.getElementById('warp-drive__diagnostic');
  assert(
    `Expected to find a diagnostic container element. Make sure your html file has added <div id="warp-drive__diagnostic"></div>`,
    container !== null
  );
  const settings = getSettings();

  let emitter: Emitter | null = null;
  if (settings.useTestem) {
    const { createTestemEmitter } = await import('../emitters/testem');
    emitter = await createTestemEmitter();
  } else if (settings.useDiagnostic) {
    const { createDiagnosticEmitter } = await import('../emitters/diagnostic');
    emitter = await createDiagnosticEmitter();
  }
  registerReporter(new DOMReporter(container, emitter));

  await _start();
}
