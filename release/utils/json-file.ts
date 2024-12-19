import { BunFile } from 'bun';
import chalk from 'chalk';

const EOL = '\n';
export class JSONFile<T extends object = Record<string, unknown>> {
  declare contents: T | null;
  declare filePath: string;
  declare handle: BunFile;

  #lastKnown: string | null = null;

  constructor(filePath: string) {
    this.contents = null;
    this.filePath = filePath;
  }

  async #getHandle() {
    if (!this.handle) {
      const fileHandle = Bun.file(this.filePath, { type: 'application/json' });
      const exists = await fileHandle.exists();

      if (!exists) {
        throw new Error(`The file ${chalk.white(this.filePath)} does not exist!`);
      }

      this.handle = fileHandle;
    }

    return this.handle;
  }

  async invalidate() {
    this.contents = null;
  }

  async read(): Promise<T> {
    if (this.contents === null) {
      const fileHandle = await this.#getHandle();
      const data = await fileHandle.json<T>();
      this.contents = data;
      this.#lastKnown = JSON.stringify(data, null, 2);
    }

    return this.contents;
  }

  async write(allowNoop?: boolean): Promise<void> {
    if (this.contents === null) {
      throw new Error(`Cannot write before updating contents`);
    }
    const strData = JSON.stringify(this.contents, null, 2) + EOL;
    if (this.#lastKnown === strData) {
      if (allowNoop) {
        return;
      }
      throw new Error(`Should not write when not updating contents`);
    }
    this.#lastKnown = strData;
    const fileHandle = await this.#getHandle();
    await Bun.write(fileHandle, strData);
  }
}

const FILES: Map<string, JSONFile> = new Map();

export function getFile<T extends object = object>(filePath: string): JSONFile<T> {
  let file: JSONFile<T> | undefined = FILES.get(filePath) as JSONFile<T>;
  if (!file) {
    file = new JSONFile<T>(filePath);
  }
  return file;
}
