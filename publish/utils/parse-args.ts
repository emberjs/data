export type Command = {
  name: string;
  cmd: string;
  description: string;
  example?: string | string[];
  overview?: string;
  default?: boolean;
  alt?: string[];
  options?: FlagConfig;
};
export type CommandConfig = Record<string, Command>;
export type Flag = {
  name: string;
  flag: string;
  flag_aliases?: string[];
  flag_mispellings?: string[];
  description: string;
  validate?: (value: unknown, config: Map<string, string | number | boolean | null>) => void | Promise<void>;
  examples: Array<
    | string
    | {
        desc: string;
        example: string[];
      }
  >;
  type: StringConstructor | NumberConstructor | BooleanConstructor;
  default_value?:
    | string
    | number
    | boolean
    | null
    | ((
        config: Map<string, string | number | boolean | null>
      ) => string | number | boolean | null | Promise<string | number | boolean | null>);
  /*
    Positional flags are not specified by name, but by position
    When using this with more than one positional flag, you must specify positional_index
  */
  positional?: boolean;
  /*
    Positional flags must be specified in order
    If you have two positional flags, you must specify positional_index

    Discovered positional values will be mapped to flags based on their relative
    index. E.g. first positional value discovered is `0`, second is `1` and so on.
  */
  positional_index?: number;
  /*
    Required flags must be specified by the user, and will throw an error if not
  */
  required?: boolean;
  required_error?: string;
  /*
    If a boolean flag is present AND does not have an explicitly set value, its value
      is false instead of true
    If a boolean flag is not present, the default_value is used if one is provided,
      else the value is true (instead of false)

    e.g.

    `--some-bool` -> false
    `--some-bool=true` -> true
    `--some-bool=1` -> true
    `--some-bool=false` -> false
    `--some-bool=0` -> false
  */
  invert_boolean?: boolean;
};
export interface FlagConfig {
  [key: string]: Flag;
}

const FalseyStrings = new Set(['false', '0', 'no', 'n', 'off', '']);

function processRawValue(config: Flag, raw_value: string | undefined): string | number | boolean | null {
  if (raw_value === undefined) {
    if (config.type === Boolean) {
      return config.invert_boolean ? false : true;
    } else if (config.default_value !== undefined && typeof config.default_value !== 'function') {
      return config.default_value;
    }
    raw_value = '';
  }

  if (config.type === Boolean) {
    return !FalseyStrings.has(raw_value.toLowerCase());
  } else if (config.type === Number) {
    return Number(raw_value);
  } else {
    return raw_value;
  }
}

async function processMissingFlag(
  config: Flag,
  values: Map<string, string | number | boolean | null>
): Promise<string | number | boolean | null> {
  if (config.default_value !== undefined) {
    if (typeof config.default_value === 'function') {
      return await config.default_value(values);
    }
    return config.default_value;
  } else if (config.type === Boolean && config.invert_boolean) {
    return true;
  } else {
    throw new Error(`Flag ${config.name} (${config.flag}) had no default value and was not provided by the user`);
  }
}

/**
 * process the config to create mappings for aliases and misspellings
 */
function createMappings(flags_config: FlagConfig): {
  aliases: Map<string, string>;
  spellings: Map<string, string>;
  positional: Flag[];
  all: Map<string, Flag>;
} {
  const aliases = new Map();
  const spellings = new Map();
  const seen_positions = new Set();
  const positional: Flag[] = [];
  const all = new Map();
  Object.keys(flags_config).forEach((f) => {
    const flag = normalizeFlag(f);
    const config = flags_config[f];

    if (config.flag !== flag) {
      throw new Error(`Expected configuration key ${flag} for ${config.name} to match ${config.flag}`);
    }
    all.set(flag, config);

    // TODO validate flag config structure more thoroughly
    // esp for non-optional fields

    if (config.positional) {
      if (typeof config.positional_index !== 'number') {
        throw new Error(`Positional flag ${config.name} must specify positional_index in its config`);
      }
      if (seen_positions.has(config.positional_index)) {
        throw new Error(`Positional flag ${config.name} has a duplicate positional_index`);
      }
      seen_positions.add(config.positional_index);
      positional.push(config);
    }

    if (Array.isArray(config.flag_aliases)) {
      config.flag_aliases.forEach((a) => {
        const alias = normalizeFlag(a);
        if (alias.length !== 1) {
          throw new Error(`Flag aliases must be a single character, found ${alias} for ${flag}`);
        }
        if (aliases.has(alias)) {
          throw new Error(`Alias ${alias} is already in use by ${aliases.get(alias)}`);
        }
        aliases.set(alias, flag);
      });
    }

    // always add ourself to the spellings map
    spellings.set(flag, flag);
    if (Array.isArray(config.flag_mispellings)) {
      config.flag_mispellings.forEach((msp) => {
        const misspelling = normalizeFlag(msp);
        if (misspelling.length < 2) {
          throw new Error(`Flag misspellings must be at least two characters, found ${misspelling} for ${flag}`);
        }
        if (spellings.has(misspelling)) {
          throw new Error(`Misspelling ${misspelling} is already in use by ${spellings.get(misspelling)}`);
        }
        spellings.set(misspelling, flag);
      });
    }
  });

  positional.sort((a, b) => {
    return a.positional_index! > b.positional_index! ? 1 : -1;
  });

  return { aliases, spellings, positional, all };
}

/**
 * normalize a string to lowercase and replace dashes with underscores
 *
 */
export function normalizeFlag(str: string): string {
  let normalized = str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replaceAll('-', '_');

  while (normalized.charAt(0) === '_') {
    normalized = normalized.slice(1);
  }

  return normalized;
}

/**
 * Process raw user provided command line arguments into a populated config object
 */
export async function parseRawFlags(
  raw: string[],
  flags_config: FlagConfig
): Promise<{
  specified: Map<string, string | number | boolean | null>;
  full: Map<string, string | number | boolean | null>;
}> {
  let current_position = 0;
  const processed_flags = new Map();
  const { aliases, spellings, positional, all } = createMappings(flags_config);

  for (let i = 0; i < raw.length; i++) {
    const raw_arg = raw[i];

    // handle named args
    if (raw_arg.startsWith('--')) {
      const arg = raw_arg.slice(2);
      const parts = arg.split('=');
      const spelling = normalizeFlag(parts[0]);
      const flag = spellings.get(spelling);
      if (!flag) {
        throw new Error(`Unknown flag: ${spelling}`);
      }
      const config = flags_config[flag];
      let raw_value = parts[1];

      if (config) {
        if (processed_flags.has(flag)) {
          throw new Error(`Flag ${flag} was provided more than once`);
        }

        // scan ahead for a value
        // scan ahead is not valid for boolean flags
        if (raw_value === undefined && config.type !== Boolean) {
          const potential_value = raw[i + 1];
          if (potential_value && !potential_value.startsWith('-')) {
            raw_value = potential_value;
            i++;
          }
        }

        processed_flags.set(flag, processRawValue(config, raw_value));
      } else {
        throw new Error(`Unknown flag: ${flag}`);
      }

      // treat as aliases
    } else if (raw_arg.startsWith('-')) {
      const arg = normalizeFlag(raw_arg.slice(1));
      // we only allow one non-boolean flag per alias group
      let has_found_non_boolean_flag = false;

      for (let j = 0; j < arg.length; j++) {
        const alias = arg[j];
        const flag = aliases.get(alias);
        if (!flag) {
          throw new Error(`Unknown flag alias: ${alias}`);
        }
        const config = flags_config[flag];
        if (!config) {
          throw new Error(`Unknown flag: ${flag} found for alias ${alias}`);
        }
        if (processed_flags.has(flag)) {
          throw new Error(`Flag ${flag} was provided more than once (discovered via alias '${alias}')`);
        }
        let raw_value: string | undefined = undefined;
        if (config.type !== Boolean) {
          if (has_found_non_boolean_flag) {
            throw new Error(`An alias group may only contain one non-boolean flag alias`);
          }

          // scan ahead for the value
          const potential_value = raw[i + 1];
          if (potential_value && !potential_value.startsWith('-')) {
            raw_value = potential_value;
            i++;
          } else {
            throw new Error(
              `The non-boolean flag alias ${alias} was provided for ${flag} without a corresponding value as the next argument`
            );
          }

          has_found_non_boolean_flag = true;
        }
        processed_flags.set(flag, processRawValue(config, raw_value));
      }

      // treat as positional
    } else {
      const config = positional[current_position++];
      if (!config) {
        throw new Error(`Unknown positional argument: ${raw_arg}`);
      }

      const value = processRawValue(config, raw_arg);
      processed_flags.set(config.flag, value);
    }
  }

  const full_flags = new Map(processed_flags);

  // process full flags
  for (const [flag, config] of all) {
    if (processed_flags.has(flag)) {
      await config.validate?.(processed_flags.get(flag), processed_flags);
      continue;
    }

    if (config.required) {
      throw new Error(config.required_error || `Missing required flag: ${flag}`);
    }

    const val = await processMissingFlag(config, processed_flags);
    full_flags.set(flag, val);
  }

  return {
    specified: processed_flags,
    full: full_flags,
  };
}
