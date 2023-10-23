import type { Link, Meta } from './raw';

export interface ApiError {
  id?: string;
  title?: string;
  detail?: string;
  links?: {
    about?: Link;
    type?: Link;
  };
  status?: string;
  code?: string;
  source?: {
    pointer: string;
    parameter?: string;
    header?: string;
  };
  meta?: Meta;
}
