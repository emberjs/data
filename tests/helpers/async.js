import Ember from 'ember';

export function wait(callback, timeout) {
  let done = this.async();

  var timer = setTimeout(() => {
    this.ok(false, "Timeout was reached");
    done();
  }, timeout || 200);

  return function() {
    window.clearTimeout(timer);

    var args = arguments;
    var result;
    try {
      result = Ember.run(function() {
        return callback.apply(this, args);
      });
    } finally {
      done();
    }
    return result;
  };
}

export function asyncEqual(a, b, message) {
  return Ember.RSVP.all([Ember.RSVP.resolve(a), Ember.RSVP.resolve(b)]).then(this.wait((array) => {
    this.push(array[0] === array[1], array[0], array[1], message);
  }));
}

export function invokeAsync(callback, timeout) {
  timeout = timeout || 1;

  setTimeout(this.wait(callback, timeout+100), timeout);
}

