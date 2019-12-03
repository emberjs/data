import { all, resolve } from 'rsvp';
import { run } from '@ember/runloop';

// Should not use these going forward, use async/await instead.
export function wait(callback, timeout) {
  let done = this.async();

  let timer = setTimeout(() => {
    this.ok(false, 'Timeout was reached');
    done();
  }, timeout || 200);

  return function() {
    window.clearTimeout(timer);

    let args = arguments;
    let result;
    try {
      result = run(() => callback.apply(this, args));
    } finally {
      done();
    }
    return result;
  };
}

export function asyncEqual(a, b, message) {
  return all([resolve(a), resolve(b)]).then(
    this.wait(array => {
      let actual = array[0];
      let expected = array[1];
      let result = actual === expected;

      this.pushResult({ result, actual, expected, message });
    })
  );
}

export function invokeAsync(callback, timeout = 1) {
  setTimeout(this.wait(callback, timeout + 100), timeout);
}
