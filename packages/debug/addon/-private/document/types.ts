import { Dict } from '../../types/ember-data-json-api';

export interface ValidationIssues {
  errors: Array<Error>;
  warnings: Array<Error>;
}

export interface ValidationContext {
  schema: any;
  document: unknown;
  target: unknown;
  issues: ValidationIssues;
  path: string;
  options?: Dict<string, any>;
}

export interface ErrorContext {
  member: string;
  value: any;
  code: number;
  path: string;
  options?: Dict<string, any>;
  schema?: any;
  document?: unknown;
  target?: unknown;
}
