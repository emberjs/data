import Ember from 'ember';
import QUnit from 'qunit';

const qAsync = QUnit.assert.async;
const {ok}   = QUnit.assert;

export default function async(callback, timeout) {
  var timer;
  let done = qAsync();

  timer = setTimeout(function() {
    done();
    ok(false, "Timeout was reached");
  }, timeout || 200);

  return function() {
    window.clearTimeout(timer);

    done();

    var args = arguments;
    return Ember.run(function() {
      return callback.apply(this, args);
    });
  };
}
export {async};

export function asyncEqual(a, b, message) {
  return Ember.RSVP.all([Ember.RSVP.resolve(a), Ember.RSVP.resolve(b)]).then(async(function(array) {
    /*globals QUnit*/
    QUnit.push(array[0] === array[1], array[0], array[1], message);
  }));
}

export function invokeAsync(callback, timeout) {
  timeout = timeout || 1;

  setTimeout(async(callback, timeout+100), timeout);
}

