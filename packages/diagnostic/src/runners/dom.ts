import { assert, getGlobal } from '../-utils';
import { start as _start, registerReporter } from '../';
import { DOMReporter } from '../reporters/dom';

export async function start() {
  const context = getGlobal();
  const body = context.document?.body;

  assert(`Expected to be in a browser environment`, typeof body !== 'undefined');

  const container = context.document.getElementById('warp-drive__diagnostic');
  assert(`Expected to find a diagnostic container element. Make sure your html file has added <div id="warp-drive__diagnostic"></div>`, container !== null);

  registerReporter(new DOMReporter(container));

  await _start();
}
