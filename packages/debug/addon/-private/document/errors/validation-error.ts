import padLeft from '../../-utils/pad-left';
import { ErrorContext } from '../types';

export function createValidationError(message: string): Error {
  try {
    throw new Error(message);
  } catch (e) {
    return e;
  }
}

let _ERROR_ID = 0;

export function uniqueErrorId() {
  return _ERROR_ID++;
}

export const NICE_ERROR_TYPES = {
  KEY_ERROR: 1,
  VALUE_ERROR: 2,
  OBJECT_ERROR: 3,
};

export function createNiceErrorMessage(options: ErrorContext): string {
  let { member, value, path, code } = options;
  let parts, message, depth;

  switch (code) {
    case NICE_ERROR_TYPES.KEY_ERROR:
      parts = path.split('.').filter(i => i !== '');
      message = '\n\n\t{\n\t';
      depth = 2;

      for (let i = 0; i < parts.length; i++) {
        message += `${padLeft(parts[i], depth)}: {\n\t`;
        depth += 2;
      }

      message += `${padLeft(member, depth)}: ${
        typeof value === 'string' ? "'" + value + "'" : value
      }\n\t`;
      message += `${padLeft('^', depth, '-')}\n\n`;

      return message;

    case NICE_ERROR_TYPES.OBJECT_ERROR:
      parts = path.split('.').filter(i => i !== '');
      message = '\n\n\t' + String(value) + '\n';
      message += `${padLeft('^', 3, '-')}\n\n`;
      return message;

    case NICE_ERROR_TYPES.VALUE_ERROR:
      parts = path.split('.').filter(i => i !== '');
      message = '\n\n\t{\n\t';
      depth = 2;

      for (let i = 0; i < parts.length; i++) {
        message += `${padLeft(parts[i], depth)}: {\n\t`;
        depth += 2;
      }

      message += `${padLeft(member, depth)}: ${
        typeof value === 'string' ? "'" + value + "'" : value
      }\n\t`;
      depth += member.length + 2;
      message += `${padLeft('^', depth, '-')}\n\n`;

      return message;

    default:
      throw new Error('Cannot format error for unknown error code');
  }
}
