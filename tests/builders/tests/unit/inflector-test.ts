import {
  clear,
  clearRules,
  irregular,
  plural,
  pluralize,
  resetToDefaults,
  singular,
  singularize,
  uncountable,
} from '@ember-data/request-utils/string';
import { module, test } from '@warp-drive/diagnostic';

module('Inflector', function (hooks) {
  hooks.afterEach(() => {
    resetToDefaults();
  });

  module('dsl', () => {
    test('ability to add additional pluralization rules', (assert) => {
      clearRules();
      assert.equal(pluralize('cow'), 'cow', 'no pluralization rule');

      plural(/$/, 's');
      clear();

      assert.equal(pluralize('cow'), 'cows', 'pluralization rule was applied');
    });

    test('ability to add additional singularization rules', (assert) => {
      clearRules();
      assert.equal(singularize('cows'), 'cows', 'no singularization rule was applied');

      singular(/s$/, '');
      clear();

      assert.equal(singularize('cows'), 'cow', 'singularization rule was applied');
    });

    test('ability to add additional uncountable rules', (assert) => {
      clearRules();
      plural(/$/, 's');
      assert.equal(pluralize('cow'), 'cows', 'pluralization rule was applied');

      uncountable('cow');
      clear();
      assert.equal(pluralize('cow'), 'cow', 'pluralization rule NOT was applied');
      assert.equal(pluralize('redCow'), 'redCow', 'pluralization rule NOT was applied');
      assert.equal(pluralize('red-cow'), 'red-cow', 'pluralization rule NOT was applied');
      assert.equal(pluralize('red/cow'), 'red/cow', 'pluralization rule NOT was applied');
    });

    test('ability to add additional irregular rules', (assert) => {
      clearRules();
      singular(/s$/, '');
      plural(/$/, 's');

      assert.equal(singularize('cows'), 'cow', 'regular singularization rule was applied');
      assert.equal(pluralize('cow'), 'cows', 'regular pluralization rule was applied');

      assert.equal(singularize('red-cows'), 'red-cow', 'regular singularization rule was applied');
      assert.equal(pluralize('red-cow'), 'red-cows', 'regular pluralization rule was applied');

      assert.equal(singularize('redCows'), 'redCow', 'regular singularization rule was applied');
      assert.equal(pluralize('redCow'), 'redCows', 'regular pluralization rule was applied');

      assert.equal(singularize('red/cows'), 'red/cow', 'regular singularization rule was applied');
      assert.equal(pluralize('red/cow'), 'red/cows', 'regular pluralization rule was applied');

      irregular('cow', 'kine');
      clear();

      assert.equal(singularize('kine'), 'cow', 'irregular singularization rule was applied');
      assert.equal(pluralize('cow'), 'kine', 'irregular pluralization rule was applied');

      assert.equal(singularize('red-kine'), 'red-cow', 'irregular singularization rule was applied');
      assert.equal(pluralize('red-cow'), 'red-kine', 'irregular pluralization rule was applied');

      assert.equal(
        singularize('red-red-cow'),
        'red-red-cow',
        'irregular singularization rule was applied correctly with dasherization'
      );
      assert.equal(
        singularize('red-red-kine'),
        'red-red-cow',
        'irregular singularization rule was applied correctly with dasherization'
      );
      assert.equal(
        pluralize('red-red-cow'),
        'red-red-kine',
        'irregular pluralization rule was applied correctly with dasherization'
      );
      assert.equal(
        pluralize('red-red-kine'),
        'red-red-kine',
        'irregular pluralization rule was applied correctly with dasherization'
      );

      assert.equal(singularize('redKine'), 'redCow', 'irregular singularization rule was applied');
      assert.equal(pluralize('redCow'), 'redKine', 'irregular pluralization rule was applied');

      assert.equal(singularize('red/kine'), 'red/cow', 'irregular singularization rule was applied');
      assert.equal(pluralize('red/cow'), 'red/kine', 'irregular pluralization rule was applied');
    });

    test('ability to add identical singular and pluralizations', (assert) => {
      clearRules();
      singular(/s$/, '');
      plural(/$/, 's');

      assert.equal(singularize('settings'), 'setting', 'regular singularization rule was applied');
      assert.equal(pluralize('setting'), 'settings', 'regular pluralization rule was applied');

      irregular('settings', 'settings');
      irregular('userPreferences', 'userPreferences');
      clear();

      assert.equal(singularize('settings'), 'settings', 'irregular singularization rule was applied on lowercase word');
      assert.equal(pluralize('settings'), 'settings', 'irregular pluralization rule was applied on lowercase word');

      assert.equal(
        singularize('userPreferences'),
        'userPreferences',
        'irregular singularization rule was applied on camelcase word'
      );
      assert.equal(
        pluralize('userPreferences'),
        'userPreferences',
        'irregular pluralization rule was applied on camelcase word'
      );
    });
  });

  module('unit', () => {
    test('plurals', (assert) => {
      const plurals: Array<[RegExp, string]> = [
        [/$/, 's'],
        [/s$/i, 's'],
      ];
      plurals.forEach((v) => plural(v[0], v[1]));

      assert.equal(pluralize('apple'), 'apples');
    });

    test('singularization', (assert) => {
      const singulars: Array<[RegExp, string]> = [
        [/s$/i, ''],
        [/(ss)$/i, '$1'],
      ];
      singulars.forEach((v) => singular(v[0], v[1]));

      assert.equal(singularize('apple'), 'apple');
    });

    test('singularization of irregular singulars', (assert) => {
      const singulars: Array<[RegExp, string]> = [
        [/s$/i, ''],
        [/(ss)$/i, '$1'],
      ];
      singulars.forEach((v) => singular(v[0], v[1]));
      irregular('lens', 'lenses');

      assert.equal(singularize('lens'), 'lens');
    });

    test('pluralization of irregular plurals', (assert) => {
      assert.equal(pluralize('people'), 'people');
    });

    test('irregular', (assert) => {
      irregular('1', '12');
      irregular('2', '22');
      irregular('3', '32');
      irregular('word', 'wordy');

      assert.equal(pluralize('1'), '12');
      assert.equal(pluralize('2'), '22');
      assert.equal(pluralize('3'), '32');
      assert.equal(pluralize('word'), 'wordy');

      assert.equal(singularize('12'), '1');
      assert.equal(singularize('22'), '2');
      assert.equal(singularize('32'), '32'); // because the rule for '2' takes precedence :facepalm:
      assert.equal(singularize('wordy'), 'word');
    });

    test('uncountable', (assert) => {
      uncountable('1');
      uncountable('2');
      uncountable('3');

      assert.equal(pluralize('1'), '1');
      assert.equal(pluralize('2'), '2');
      assert.equal(pluralize('3'), '3');
      assert.equal(singularize('1'), '1');
      assert.equal(singularize('2'), '2');
      assert.equal(singularize('3'), '3');
    });

    test('defaultRules matches docs', (assert) => {
      // defaultRules includes these special rules
      assert.equal(pluralize('cow'), 'kine');
      assert.equal(singularize('kine'), 'cow');

      // defaultRules adds 's' to singular
      assert.equal(pluralize('item'), 'items');

      // defaultRules removes 's' from plural
      assert.equal(singularize('items'), 'item');
    });

    test('words containing irregular and uncountable words can be pluralized', (assert) => {
      assert.equal(pluralize('woman'), 'women');
      assert.equal(pluralize('salesperson'), 'salespeople');
    });

    test('words containing irregular and uncountable words can be singularized', (assert) => {
      assert.equal(singularize('women'), 'woman');
      assert.equal(singularize('salespeople'), 'salesperson');
      assert.equal(singularize('pufferfish'), 'pufferfish');
    });

    test('partial words containing uncountable words can be pluralized', (assert) => {
      assert.equal(pluralize('price'), 'prices');
    });

    test('partial words containing uncountable words can be singularized', (assert) => {
      assert.equal(singularize('subspecies'), 'subspecy');
    });

    test('CamelCase and UpperCamelCase is preserved for irregular and uncountable pluralizations', (assert) => {
      assert.equal(pluralize('SuperWoman'), 'SuperWomen');
      assert.equal(pluralize('superWoman'), 'superWomen');
      assert.equal(pluralize('SuperMan'), 'SuperMen');
      assert.equal(pluralize('superMan'), 'superMen');
      assert.equal(pluralize('FriedRice'), 'FriedRice');
      assert.equal(pluralize('friedRice'), 'friedRice');
    });

    test('CamelCase and UpperCamelCase is preserved for irregular and uncountable singularization', (assert) => {
      assert.equal(singularize('SuperWomen'), 'SuperWoman');
      assert.equal(singularize('superWomen'), 'superWoman');
      assert.equal(singularize('SuperMen'), 'SuperMan');
      assert.equal(singularize('superMen'), 'superMan');
      assert.equal(singularize('FriedRice'), 'FriedRice');
      assert.equal(singularize('friedRice'), 'friedRice');
    });

    test('CamelCase custom irregular words', (assert) => {
      irregular('unitOfMeasure', 'unitsOfMeasure');
      irregular('tipoDocumento', 'tiposDocumento');

      assert.equal(singularize('unitsOfMeasure'), 'unitOfMeasure');
      assert.equal(pluralize('unitOfMeasure'), 'unitsOfMeasure');

      assert.equal(singularize('tiposDocumento'), 'tipoDocumento');
      assert.equal(pluralize('tipoDocumento'), 'tiposDocumento');
    });

    test('pluralize passes same test cases as ActiveSupport::Inflector#pluralize', (assert) => {
      assert.equal(pluralize('search'), 'searches');
      assert.equal(pluralize('switch'), 'switches');
      assert.equal(pluralize('fix'), 'fixes');
      assert.equal(pluralize('box'), 'boxes');
      assert.equal(pluralize('process'), 'processes');
      assert.equal(pluralize('address'), 'addresses');
      assert.equal(pluralize('case'), 'cases');
      assert.equal(pluralize('stack'), 'stacks');
      assert.equal(pluralize('wish'), 'wishes');
      assert.equal(pluralize('fish'), 'fish');
      assert.equal(pluralize('jeans'), 'jeans');
      assert.equal(pluralize('funky jeans'), 'funky jeans');
      assert.equal(pluralize('my money'), 'my money');
      assert.equal(pluralize('category'), 'categories');
      assert.equal(pluralize('query'), 'queries');
      assert.equal(pluralize('ability'), 'abilities');
      assert.equal(pluralize('agency'), 'agencies');
      assert.equal(pluralize('movie'), 'movies');
      assert.equal(pluralize('archive'), 'archives');
      assert.equal(pluralize('index'), 'indices');
      assert.equal(pluralize('wife'), 'wives');
      assert.equal(pluralize('safe'), 'saves');
      assert.equal(pluralize('half'), 'halves');
      assert.equal(pluralize('move'), 'moves');
      assert.equal(pluralize('salesperson'), 'salespeople');
      assert.equal(pluralize('person'), 'people');
      assert.equal(pluralize('spokesman'), 'spokesmen');
      assert.equal(pluralize('man'), 'men');
      assert.equal(pluralize('woman'), 'women');
      assert.equal(pluralize('basis'), 'bases');
      assert.equal(pluralize('diagnosis'), 'diagnoses');
      assert.equal(pluralize('diagnosis_a'), 'diagnosis_as');
      assert.equal(pluralize('datum'), 'data');
      assert.equal(pluralize('medium'), 'media');
      assert.equal(pluralize('stadium'), 'stadia');
      assert.equal(pluralize('analysis'), 'analyses');
      assert.equal(pluralize('my_analysis'), 'my_analyses');
      assert.equal(pluralize('node_child'), 'node_children');
      assert.equal(pluralize('child'), 'children');
      assert.equal(pluralize('experience'), 'experiences');
      assert.equal(pluralize('day'), 'days');
      assert.equal(pluralize('comment'), 'comments');
      assert.equal(pluralize('foobar'), 'foobars');
      assert.equal(pluralize('newsletter'), 'newsletters');
      assert.equal(pluralize('old_news'), 'old_news');
      assert.equal(pluralize('news'), 'news');
      assert.equal(pluralize('series'), 'series');
      assert.equal(pluralize('miniseries'), 'miniseries');
      assert.equal(pluralize('species'), 'species');
      assert.equal(pluralize('quiz'), 'quizzes');
      assert.equal(pluralize('perspective'), 'perspectives');
      assert.equal(pluralize('ox'), 'oxen');
      assert.equal(pluralize('photo'), 'photos');
      assert.equal(pluralize('buffalo'), 'buffaloes');
      assert.equal(pluralize('tomato'), 'tomatoes');
      assert.equal(pluralize('dwarf'), 'dwarves');
      assert.equal(pluralize('elf'), 'elves');
      assert.equal(pluralize('information'), 'information');
      assert.equal(pluralize('equipment'), 'equipment');
      assert.equal(pluralize('bus'), 'buses');
      assert.equal(pluralize('status'), 'statuses');
      assert.equal(pluralize('status_code'), 'status_codes');
      assert.equal(pluralize('mouse'), 'mice');
      assert.equal(pluralize('louse'), 'lice');
      assert.equal(pluralize('house'), 'houses');
      assert.equal(pluralize('octopus'), 'octopi');
      assert.equal(pluralize('virus'), 'viri');
      assert.equal(pluralize('alias'), 'aliases');
      assert.equal(pluralize('portfolio'), 'portfolios');
      assert.equal(pluralize('vertex'), 'vertices');
      assert.equal(pluralize('matrix'), 'matrices');
      assert.equal(pluralize('matrix_fu'), 'matrix_fus');
      assert.equal(pluralize('axis'), 'axes');
      assert.equal(pluralize('taxi'), 'taxis');
      assert.equal(pluralize('testis'), 'testes');
      assert.equal(pluralize('crisis'), 'crises');
      assert.equal(pluralize('rice'), 'rice');
      assert.equal(pluralize('shoe'), 'shoes');
      assert.equal(pluralize('horse'), 'horses');
      assert.equal(pluralize('prize'), 'prizes');
      assert.equal(pluralize('edge'), 'edges');
      assert.equal(pluralize('database'), 'databases');
      assert.equal(pluralize('|ice'), '|ices');
      assert.equal(pluralize('|ouse'), '|ouses');
      assert.equal(pluralize('slice'), 'slices');
      assert.equal(pluralize('police'), 'police');
    });

    test('singularize passes same test cases as ActiveSupport::Inflector#singularize', (assert) => {
      assert.equal(singularize('searches'), 'search');
      assert.equal(singularize('switches'), 'switch');
      assert.equal(singularize('fixes'), 'fix');
      assert.equal(singularize('boxes'), 'box');
      assert.equal(singularize('processes'), 'process');
      assert.equal(singularize('addresses'), 'address');
      assert.equal(singularize('cases'), 'case');
      assert.equal(singularize('stacks'), 'stack');
      assert.equal(singularize('wishes'), 'wish');
      assert.equal(singularize('fish'), 'fish');
      assert.equal(singularize('jeans'), 'jeans');
      assert.equal(singularize('funky jeans'), 'funky jeans');
      assert.equal(singularize('my money'), 'my money');
      assert.equal(singularize('categories'), 'category');
      assert.equal(singularize('queries'), 'query');
      assert.equal(singularize('abilities'), 'ability');
      assert.equal(singularize('agencies'), 'agency');
      assert.equal(singularize('movies'), 'movie');
      assert.equal(singularize('archives'), 'archive');
      assert.equal(singularize('indices'), 'index');
      assert.equal(singularize('wives'), 'wife');
      assert.equal(singularize('saves'), 'safe');
      assert.equal(singularize('halves'), 'half');
      assert.equal(singularize('moves'), 'move');
      assert.equal(singularize('salespeople'), 'salesperson');
      assert.equal(singularize('people'), 'person');
      assert.equal(singularize('spokesmen'), 'spokesman');
      assert.equal(singularize('men'), 'man');
      assert.equal(singularize('women'), 'woman');
      assert.equal(singularize('bases'), 'basis');
      assert.equal(singularize('diagnoses'), 'diagnosis');
      assert.equal(singularize('diagnosis_as'), 'diagnosis_a');
      assert.equal(singularize('data'), 'datum');
      assert.equal(singularize('media'), 'medium');
      assert.equal(singularize('stadia'), 'stadium');
      assert.equal(singularize('analyses'), 'analysis');
      assert.equal(singularize('my_analyses'), 'my_analysis');
      assert.equal(singularize('node_children'), 'node_child');
      assert.equal(singularize('children'), 'child');
      assert.equal(singularize('experiences'), 'experience');
      assert.equal(singularize('days'), 'day');
      assert.equal(singularize('comments'), 'comment');
      assert.equal(singularize('foobars'), 'foobar');
      assert.equal(singularize('newsletters'), 'newsletter');
      assert.equal(singularize('old_news'), 'old_news');
      assert.equal(singularize('news'), 'news');
      assert.equal(singularize('series'), 'series');
      assert.equal(singularize('miniseries'), 'miniseries');
      assert.equal(singularize('species'), 'species');
      assert.equal(singularize('quizzes'), 'quiz');
      assert.equal(singularize('perspectives'), 'perspective');
      assert.equal(singularize('oxen'), 'ox');
      assert.equal(singularize('photos'), 'photo');
      assert.equal(singularize('buffaloes'), 'buffalo');
      assert.equal(singularize('tomatoes'), 'tomato');
      assert.equal(singularize('dwarves'), 'dwarf');
      assert.equal(singularize('elves'), 'elf');
      assert.equal(singularize('information'), 'information');
      assert.equal(singularize('equipment'), 'equipment');
      assert.equal(singularize('buses'), 'bus');
      assert.equal(singularize('statuses'), 'status');
      assert.equal(singularize('status_codes'), 'status_code');
      assert.equal(singularize('mice'), 'mouse');
      assert.equal(singularize('lice'), 'louse');
      assert.equal(singularize('houses'), 'house');
      assert.equal(singularize('octopi'), 'octopus');
      assert.equal(singularize('viri'), 'virus');
      assert.equal(singularize('aliases'), 'alias');
      assert.equal(singularize('portfolios'), 'portfolio');
      assert.equal(singularize('vertices'), 'vertex');
      assert.equal(singularize('matrices'), 'matrix');
      assert.equal(singularize('matrix_fus'), 'matrix_fu');
      assert.equal(singularize('axes'), 'axis');
      assert.equal(singularize('taxis'), 'taxi');
      assert.equal(singularize('testes'), 'testis');
      assert.equal(singularize('crises'), 'crisis');
      assert.equal(singularize('rice'), 'rice');
      assert.equal(singularize('shoes'), 'shoe');
      assert.equal(singularize('horses'), 'horse');
      assert.equal(singularize('prizes'), 'prize');
      assert.equal(singularize('edges'), 'edge');
      assert.equal(singularize('databases'), 'database');
      assert.equal(singularize('|ices'), '|ice');
      assert.equal(singularize('|ouses'), '|ouse');
      assert.equal(singularize('slices'), 'slice');
      assert.equal(singularize('police'), 'police');
    });

    test('singularize can singularize "bonuses"', (assert) => {
      assert.equal(singularize('bonuses'), 'bonus');
    });

    test('singularize can pluralize "bonus"', (assert) => {
      assert.equal(pluralize('bonus'), 'bonuses');
    });
  });
});
