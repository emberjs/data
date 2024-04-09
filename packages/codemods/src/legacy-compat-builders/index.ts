import type { API, FileInfo, Options } from 'jscodeshift';

/**
 * If a string is returned and it is different from passed source, the transform is considered to be successful.
 * If a string is returned but it's the same as the source, the transform is considered to be unsuccessful.
 * If nothing is returned, the file is not supposed to be transformed (which is ok).
 *
 * @returns string | undefined
 */
export default function (fileInfo: FileInfo, api: API, options: Options): string | undefined {
  return api.jscodeshift(fileInfo.source).findVariableDeclarators('foo').renameTo('bar').toSource();
}
