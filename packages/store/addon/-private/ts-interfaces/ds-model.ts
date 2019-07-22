import { Record } from './record';
import RSVP from 'rsvp';

// Placeholder until model.js is typed
export interface DSModel extends Record {
  save(): RSVP.Promise<DSModel>;
}
