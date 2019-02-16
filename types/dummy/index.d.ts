/**
 * Any types defined here are only for the purposes of building and testing
 * ember-data. They will not be shipped to consumers. Ember-data still relies
 * on some private Ember APIs -- those should be defined here as we encounter them.
 */

// Heimdall is TS now, we should be able to make this
//  not suck
type TCounterToken = number;
type TTimerToken = number;

interface ICounterDict {
  [counterName: string]: TCounterToken;
}

interface IHeimdall {
  registerMonitor(...counterNames: string[]): ICounterDict;
  increment(counter: TCounterToken): void;
  start(timerLabel: string): TTimerToken;
  stop(token: TTimerToken): void;
}

// hrm :/
declare const heimdall: IHeimdall;
