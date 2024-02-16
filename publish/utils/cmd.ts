import chalk from 'chalk';
import path from 'path';
import * as readline from 'readline/promises';

type CMD = {
  cwd?: string;
  cmd: string[] | string;
  condense?: boolean;
  lines?: number;
  silent?: boolean;
};

// async function step() {
//   await new Promise((resolve) => setTimeout(resolve, 10));
// }

const isCI = Boolean(Bun.env.CI);
class CLICondenser {
  declare reader: ReadableStreamDefaultReader<Uint8Array>;
  declare cmd: string;
  declare lines: number;
  declare cwd: string;

  constructor(cmd: string, reader: ReadableStreamDefaultReader<Uint8Array>, config: CMD) {
    this.reader = reader;
    this.cmd = cmd;
    this.lines = config.lines ?? 8;
    this.cwd = config.cwd ?? process.cwd();
  }

  async read() {
    const { reader, cmd, lines } = this;
    let output = '';
    let currentLines = 0;
    const packets = [];

    const rd = new readline.Readline(process.stdout);
    process.stdout.write(
      `\n🚀 ${chalk.yellow(cmd)} in ${chalk.greenBright(path.relative(process.cwd(), this.cwd))}\n${chalk.magentaBright(
        `⎾`
      )}\n`
    );

    // await step();
    while (true) {
      let done, value;
      try {
        const result = await reader.read();
        done = result.done;
        value = result.value;
      } catch (e) {
        throw e;
      }
      if (done) {
        break;
      }

      const maxWidth = process.stdout.columns ?? 80;
      const maxLines = Math.min(process.stdout.rows, lines);
      const packet = new TextDecoder().decode(value, { stream: true });
      packets.push(packet);
      output += packet;
      const lineOutput = output.split(`\n`);
      const lastLines = lineOutput.slice(-maxLines);
      const lastLineOutput = lastLines
        .map((line) => {
          return chalk.magentaBright('⏐ ') + line.substring(0, maxWidth - 2);
        })
        .join(`\n`);

      if (!isCI && currentLines) {
        // process.stdout.write(`\tclearing ${currentLines} lines`);
        // await step();
        rd.cursorTo(0);
        // await rd.commit();
        // await step();
        while (currentLines--) {
          rd.clearLine(0);
          // await rd.commit();
          // await step();
          rd.moveCursor(0, currentLines === 0 ? 0 : -1);
          // await rd.commit();
          // await step();
        }
        await rd.commit();
      }

      currentLines = lastLines.length + 1;
      process.stdout.write(lastLineOutput + '\n' + chalk.magentaBright('⎿'));
      if (isCI) {
        process.stdout.write('\n');
      }
      // await step();
    }

    if (!isCI) {
      currentLines = currentLines + 3;
      // process.stdout.write(`\tclearing ${currentLines} lines`);
      // await step();
      rd.cursorTo(0);
      // await rd.commit();
      // await step();
      while (currentLines--) {
        rd.clearLine(0);
        // await rd.commit();
        // await step();
        rd.moveCursor(0, currentLines === 0 ? 0 : -1);
        // await rd.commit();
        // await step();
      }
      await rd.commit();
    }
    process.stdout.write(
      `\t☑️\t${chalk.grey(cmd)} in ${chalk.greenBright(path.relative(process.cwd(), this.cwd) || '<root>')}\n`
    );

    return output;
  }
}

/**
 *
 * @see {@link CMD}
 *
 * @internal
 */
export async function exec(cmd: string[] | string | CMD, dryRun: boolean = false) {
  const isCmdWithConfig = typeof cmd === 'object' && !Array.isArray(cmd);
  const mainCommand = isCmdWithConfig ? cmd.cmd : cmd;
  const cwd = isCmdWithConfig && cmd.cwd ? cmd.cwd : process.cwd();

  let args = mainCommand;
  if (typeof args === 'string') {
    args = args.split(' ');
  }

  if (dryRun) {
    console.log(`\t` + chalk.grey(`Would Run: ${Array.isArray(mainCommand) ? mainCommand.join(' ') : mainCommand}`));
  } else if (!isCmdWithConfig || (!cmd.condense && !cmd.silent)) {
    console.log(`\t` + chalk.grey(`Running: ${args.join(' ')}\t...`));
  }

  if (!dryRun) {
    if (isCmdWithConfig && cmd.condense) {
      const proc = Bun.spawn(args, {
        env: process.env,
        cwd,
        stderr: 'pipe',
        stdout: 'pipe',
      });

      const reader = proc.stdout.getReader() as ReadableStreamDefaultReader<Uint8Array>;
      const condenser = new CLICondenser(args.join(' '), reader, cmd);
      const result = await condenser.read();

      await proc.exited;
      if (proc.exitCode !== 0) {
        console.log(result);
        const errText = await new Response(proc.stderr).text();
        console.error(errText);
        throw proc.exitCode;
      }
      return result;
    } else {
      const proc = Bun.spawn(args, {
        env: process.env,
        cwd,
      });

      await proc.exited;
      if (proc.exitCode !== 0) {
        const logText = await new Response(proc.stdout).text();
        console.log(logText);
        const errText = await new Response(proc.stderr).text();
        console.error(errText);
        throw proc.exitCode;
      }

      return await new Response(proc.stdout).text();
    }
  } else {
    return '';
  }
}
