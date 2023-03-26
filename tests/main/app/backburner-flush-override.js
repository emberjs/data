/*
  An alternative render flush mechanism for glimmer
*/
import { Renderer } from '@ember/-internals/glimmer';
import { _backburner } from '@ember/runloop';

import * as RSVP from 'rsvp';

const HAS_RAF = typeof requestAnimationFrame !== 'undefined';
const HAS_RIC = typeof requestIdleCallback !== 'undefined';
const RENDER_DEBOUNCE_COUNT = 5;
const MICROTASK_DEBOUNCE_COUNT = 2;

// race various things to flush
function _performRace(resolve) {
  let resolved = false;
  const complete = () => {
    if (resolved) return;
    resolved = true;
    resolve();
  };

  if (HAS_RAF)
    requestAnimationFrame(() => {
      if (!resolved) {
        if (HAS_RIC) requestIdleCallback(complete);
        setTimeout(complete, 0);
      }
    });
  if (HAS_RIC) requestIdleCallback(complete);
  setTimeout(complete, 0);
}

function race() {
  return new Promise(_performRace);
}

async function awaitSettled(renderer, debounceCount = MICROTASK_DEBOUNCE_COUNT) {
  let startCount = renderer._revalidateCalls;
  let successCount = 0;
  let keepWaiting = true;

  // once we've elected to flush, we wait for the current microtask queue
  // to "settle" to begin
  while (keepWaiting) {
    await Promise.resolve();

    if (renderer._revalidateCalls === startCount) {
      successCount++;

      if (successCount === debounceCount) {
        // break loop
        keepWaiting = false;
        break;
      }
    } else {
      startCount = this._revalidateCalls;
      successCount = 0;
    }
  }

  renderer._revalidateCalls = 0;
  renderer._revalidate();
  renderer._nextRevalidate = null;
}

// add this to tests/main to find tests that only work due to rsvp Promise flush
export function restoreRSVP() {
  // restore native promise behavior to RSVP
  RSVP.configure('async', (callback, promise) => {
    Promise.resolve().then(() => {
      callback(promise);
    });
  });
}

// add this to tests/main to find tests that only work due to backburner flush timing
export function installOverride(debounceCount = MICROTASK_DEBOUNCE_COUNT) {
  // debounce autoruns to capture more potential activity
  const flush = _backburner._boundAutorunEnd;
  const original = _backburner._ensureInstance;

  _backburner._revalidateCalls = 0;
  _backburner._ensureInstance = function () {
    _backburner._scheduleInstanceCounter++;
    return original.apply(_backburner, arguments);
  };
  _backburner._revalidate = flush;
  _backburner._platform.next = () => {
    awaitSettled(_backburner, debounceCount);
  };
}

// add this to tests/main to find tests that only work due to render flush timing
// This doesn't quite work yet, likely need to patch Ember to remove the heavy
// runloop validation entanglements.
export function installRendererOverride(debounceCount = RENDER_DEBOUNCE_COUNT) {
  Renderer.prototype._scheduleRevalidate = function betterRenderFlush() {
    if (this._revalidateCalls) {
      this._revalidateCalls++;
    } else {
      this._revalidateCalls = 1;
    }
    if (!this._nextRevalidate) this._nextRevalidate = race().then(() => awaitSettled(this, debounceCount));
  };
}
