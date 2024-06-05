import { assert } from '@warp-drive/build-config/macros';

import { defaultRules } from './inflections';
import { capitalize, LRUCache } from './transform';

const BLANK_REGEX = /^\s*$/;
const LAST_WORD_DASHED_REGEX = /([\w/-]+[_/\s-])([a-z\d]+$)/;
const LAST_WORD_CAMELIZED_REGEX = /([\w/\s-]+)([A-Z][a-z\d]*$)/;
const CAMELIZED_REGEX = /[A-Z][a-z\d]*$/;

const SINGULARS = new LRUCache<string, string>((word: string) => {
  return _singularize(word);
});
const PLURALS = new LRUCache<string, string>((word: string) => {
  return _pluralize(word);
});
const UNCOUNTABLE = new Set(defaultRules.uncountable);
const IRREGULAR: Map<string, string> = new Map();
const INVERSE_IRREGULAR: Map<string, string> = new Map();
const SINGULAR_RULES = new Map(defaultRules.singular.reverse());
const PLURAL_RULES = new Map(defaultRules.plurals.reverse());

export function uncountable(word: string) {
  UNCOUNTABLE.add(word.toLowerCase());
}

export function loadUncountable(uncountables: string[]) {
  uncountables.forEach((word) => {
    uncountable(word);
  });
}

export function irregular(single: string, plur: string) {
  //pluralizing
  IRREGULAR.set(single.toLowerCase(), plur);
  IRREGULAR.set(plur.toLowerCase(), plur);

  //singularizing
  INVERSE_IRREGULAR.set(plur.toLowerCase(), single);
  INVERSE_IRREGULAR.set(single.toLowerCase(), single);
}

export function loadIrregular(irregularPairs: Array<[string, string]>) {
  irregularPairs.forEach((pair) => {
    //pluralizing
    IRREGULAR.set(pair[0].toLowerCase(), pair[1]);
    IRREGULAR.set(pair[1].toLowerCase(), pair[1]);

    //singularizing
    INVERSE_IRREGULAR.set(pair[1].toLowerCase(), pair[0]);
    INVERSE_IRREGULAR.set(pair[0].toLowerCase(), pair[0]);
  });
}
loadIrregular(defaultRules.irregularPairs);

export function clear() {
  SINGULARS.clear();
  PLURALS.clear();
}

export function resetToDefaults() {
  clearRules();
  defaultRules.uncountable.forEach((v) => UNCOUNTABLE.add(v));
  defaultRules.singular.forEach((v) => SINGULAR_RULES.set(v[0], v[1]));
  defaultRules.plurals.forEach((v) => PLURAL_RULES.set(v[0], v[1]));
  loadIrregular(defaultRules.irregularPairs);
}

export function clearRules() {
  SINGULARS.clear();
  PLURALS.clear();
  UNCOUNTABLE.clear();
  IRREGULAR.clear();
  INVERSE_IRREGULAR.clear();
  SINGULAR_RULES.clear();
  PLURAL_RULES.clear();
}

export function singularize(word: string) {
  assert(`singularize expects to receive a non-empty string`, typeof word === 'string' && word.length > 0);
  if (!word) return '';
  return SINGULARS.get(word.toLowerCase());
}

export function pluralize(word: string) {
  assert(`pluralize expects to receive a non-empty string`, typeof word === 'string' && word.length > 0);
  if (!word) return '';
  return PLURALS.get(word.toLowerCase());
}

function unshiftMap<K, V>(v: [K, V], map: Map<K, V>) {
  // reorder
  const rules = [v, ...map.entries()];
  map.clear();
  rules.forEach((rule) => {
    map.set(rule[0], rule[1]);
  });
}

export function plural(regex: RegExp, string: string) {
  // rule requires reordering if exists, so remove it first
  if (PLURAL_RULES.has(regex)) {
    PLURAL_RULES.delete(regex);
  }

  // reorder
  unshiftMap([regex, string], PLURAL_RULES);
}

export function singular(regex: RegExp, string: string) {
  // rule requires reordering if exists, so remove it first
  if (SINGULAR_RULES.has(regex)) {
    SINGULAR_RULES.delete(regex);
  }

  // reorder
  unshiftMap([regex, string], SINGULAR_RULES);
}

function _pluralize(word: string) {
  return inflect(word, PLURAL_RULES, IRREGULAR);
}

function _singularize(word: string) {
  return inflect(word, SINGULAR_RULES, INVERSE_IRREGULAR);
}

function inflect(word: string, typeRules: Map<RegExp, string>, irregulars: Map<string, string>) {
  // empty strings
  const isBlank = !word || BLANK_REGEX.test(word);
  if (isBlank) {
    return word;
  }

  // basic uncountables
  const lowercase = word.toLowerCase();
  if (UNCOUNTABLE.has(lowercase)) {
    return word;
  }

  // adv uncountables
  const wordSplit = LAST_WORD_DASHED_REGEX.exec(word) || LAST_WORD_CAMELIZED_REGEX.exec(word);
  const lastWord = wordSplit ? wordSplit[2].toLowerCase() : null;
  if (lastWord && UNCOUNTABLE.has(lastWord)) {
    return word;
  }

  // handle irregulars
  const isCamelized = CAMELIZED_REGEX.test(word);
  for (let [rule, substitution] of irregulars) {
    if (lowercase.match(rule + '$')) {
      if (isCamelized && lastWord && irregulars.has(lastWord)) {
        substitution = capitalize(substitution);
        rule = capitalize(rule);
      }

      return word.replace(new RegExp(rule, 'i'), substitution);
    }
  }

  // do the actual inflection
  for (const [rule, substitution] of typeRules) {
    if (rule.test(word)) {
      return word.replace(rule, substitution);
    }
  }

  return word;
}
