import chalk from 'chalk';
import { command_config, flags_config } from '../utils/flags-config';
import { Command, Flag } from '../utils/parse-args';
import { color, getNumTabs, getPadding, indent } from './-utils';

function buildOptionDoc(flag: Flag, index: number): string {
  const { flag_aliases, flag_mispellings, description, examples } = flag;
  const flag_shape =
    chalk.magentaBright(flag.positional ? `<${flag.flag}>` : `--${flag.flag}`) +
    (flag.required ? chalk.yellow(chalk.italic(` required`)) : '');
  const flag_aliases_str = chalk.grey(flag_aliases?.join(', ') || 'N/A');
  const flag_mispellings_str = chalk.grey(flag_mispellings?.join(', ') || 'N/A');

  return `${chalk.greenBright(flag.name)} ${flag_shape}
\t${chalk.yellow('aliases')}: ${flag_aliases_str}
\t${chalk.yellow('alt')}: ${flag_mispellings_str}
${indent(description, 1)}
\t${chalk.grey('Examples')}:
\t${examples
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
    `cy<<${cmd}>>${getPadding(getNumTabs(cmd))}${description}`,
    alt ? `\tye<<alt>>: gr<<${alt.join(', ')}>>` : '',
    overview ? `\t${overview}` : '',
    xmpl ? `\n\tgr<<${Array.isArray(example) ? 'Examples' : 'Example'}>>:` : '',
    xmpl ? `\t  ${xmpl}\n` : '',
  ].filter(Boolean);

  return color(lines.join('\n'));
}

export async function printHelpDocs(_args: string[]) {
  const config = Object.values(flags_config);
  const commands = Object.values(command_config);

  console.log(
    indent(
      `${chalk.bold('Usage')}
$ ./publish/index.ts ${chalk.magentaBright('<channel>')} [options]



${chalk.bold('Commands')}
  ${commands.map(buildCommandDoc).join('\n  ')}

${chalk.bold('Options')}
  ${config.map(buildOptionDoc).join('\n  ')}
`
    )
  );
}
