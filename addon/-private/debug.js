import Ember from 'ember';

export function assert() {
  return Ember.assert(...arguments);
}

export function debug() {
  return Ember.debug(...arguments);
}

export function deprecate() {
  return Ember.deprecate(...arguments);
}

export function info() {
  return Ember.info(...arguments);
}

export function runInDebug() {
  return Ember.runInDebug(...arguments);
}

export function warn() {
  return Ember.warn(...arguments);
}

export function debugSeal() {
  return Ember.debugSeal(...arguments);
}
