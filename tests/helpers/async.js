import { all, resolve } from 'rsvp';
import { run } from '@ember/runloop';

export function wait(callback, timeout) {
  let done = this.async();

  let timer = setTimeout(() => {
    this.ok(false, "Timeout was reached");
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
  return all([
    resolve(a),
    resolve(b)
  ]).then(this.wait((array) => {
    this.push(array[0] === array[1], array[0], array[1], message);
  }));
}

export function invokeAsync(callback, timeout = 1) {
  setTimeout(this.wait(callback, timeout + 100), timeout);
}

