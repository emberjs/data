import chalk from 'chalk';
import { command_config } from '../utils/flags-config';
import { Command, Flag } from '../utils/parse-args';
import { color, getNumTabs, getPadding, indent } from './-utils';

function getDefaultValueDescriptor(value: unknown) {
  if (typeof value === 'string') {
    return chalk.green(`"${value}"`);
  } else if (typeof value === 'number') {
    return chalk.green(`${value}`);
  } else if (typeof value === 'boolean') {
    return chalk.green(`${value}`);
  } else if (value === null) {
    return chalk.green('null');
  } else if (typeof value === 'function') {
    if (value.name) {
      return chalk.cyan(`Function<${value.name}>`);
    } else {
      return chalk.cyan(`Function`);
    }
  } else {
    return chalk.grey('N/A');
  }
}

function buildOptionDoc(flag: Flag, index: number): string {
  const { flag_aliases, flag_mispellings, description, examples } = flag;
  const flag_shape =
    chalk.magentaBright(flag.positional ? `<${flag.flag}>` : `--${flag.flag}`) +
    (flag.required ? chalk.yellow(chalk.italic(` required`)) : '');
  const flag_aliases_str = chalk.grey(flag_aliases?.join(', ') || 'N/A');
  const flag_mispellings_str = chalk.grey(flag_mispellings?.join(', ') || 'N/A');

  return `${flag_shape} ${chalk.greenBright(flag.name)}
  ${indent(description, 1)}
  ${chalk.yellow('default')}: ${getDefaultValueDescriptor(flag.default_value)}
  ${chalk.yellow('aliases')}: ${flag_aliases_str}
  ${chalk.yellow('alt')}: ${flag_mispellings_str}
  ${chalk.grey('Examples')}:
  ${examples
    .map((example) => {
      if (typeof example === 'string') {
        return example;
      } else {
        return `${example.desc}\n\t\t${example.example.join('\n\t\t')}`;
      }
    })
    .join('\n\t')}`;
}

function buildCommandDoc(command: Command, index: number): string {
  const { name, cmd, description, alt, options, overview, example } = command;
  let xmpl: string | undefined = '';

  if (Array.isArray(example)) {
    xmpl = example.join('\n\t  ');
  } else {
    xmpl = example;
  }

  const lines = [
    `cy<<${chalk.bold(cmd)}>>\n${indent(description, 1)}`,
    alt ? `\tye<<alt>>: gr<<${alt.join(', ')}>>` : '',
    overview ? `\t${overview}` : '',
    xmpl ? `\n\tgr<<${Array.isArray(example) ? 'Examples' : 'Example'}>>:` : '',
    xmpl ? `\t  ${xmpl}\n` : '',
  ].filter(Boolean);

  const opts = options ? Object.values(options) : [];
  if (opts.length > 0) {
    lines.push(
      `\t${chalk.bold(chalk.yellowBright('Options'))}`,
      indent(`${Object.values(opts).map(buildOptionDoc).join('\n\n')}`, 1)
    );
  }

  return color(lines.join('\n'));
}

export async function printHelpDocs(_args: string[]) {
  const commands = Object.values(command_config);

  console.log(
    indent(
      `${chalk.bold('Usage')}
$ ./publish/index.ts ${chalk.magentaBright('<channel>')} [options]



${chalk.bold('Commands')}
  ${commands.map(buildCommandDoc).join('\n  ')}

`
    )
  );
}
