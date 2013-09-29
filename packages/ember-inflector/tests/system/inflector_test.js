var inflector;
module('ember-inflector.dsl', {
  setup: function() {
    inflector = new Ember.Inflector(/* no rulest == no rules */);
  },
  teardown: function() {
    inflector = undefined;
  }
});

test('ability to add additonal pluralization rules', function(){
  equal(inflector.pluralize('cow'), 'cow', 'no pluralization rule');

  inflector.plural(/$/, 's');

  equal(inflector.pluralize('cow'), 'cows', 'pluralization rule was applied');
});

test('ability to add additonal singularization rules', function(){
  equal(inflector.singularize('cows'), 'cows', 'no singularization rule was applied');

  inflector.singular(/s$/, '');

  equal(inflector.singularize('cows'), 'cow', 'singularization rule was applied');
});

test('ability to add additonal uncountable rules', function(){
  inflector.plural(/$/, 's');
  equal(inflector.pluralize('cow'), 'cows', 'pluralization rule was applied');

  inflector.uncountable('cow');
  equal(inflector.pluralize('cow'), 'cow', 'pluralization rule NOT was applied');
});

test('ability to add additonal irregular rules', function(){
  inflector.singular(/s$/, '');
  inflector.plural(/$/, 's');

  equal(inflector.singularize('cows'), 'cow', 'regular singularization rule was applied');
  equal(inflector.pluralize('cow'), 'cows', 'regular pluralization rule was applied');

  inflector.irregular('cow', 'kine');

  equal(inflector.singularize('kine'), 'cow', 'irregular singularization rule was applied');
  equal(inflector.pluralize('cow'), 'kine', 'irregular pluralization rule was applied');
});

module('ember-inflector.unit');

test('plurals', function() {
  expect(1);

  var inflector = new Ember.Inflector({
    plurals: [
      [/$/, 's'],
      [/s$/i, 's']
    ]
  });

  equal(inflector.pluralize('apple'), 'apples');
});

test('singularization',function(){
  expect(1);

  var inflector = new Ember.Inflector({
    singular: [
      [/s$/i, ''],
      [/(ss)$/i, '$1']
    ]
  });

  equal(inflector.singularize('apple'), 'apple');
});

test('singularization of irregulars', function(){
  expect(1);

  var inflector = new Ember.Inflector({
    irregularPairs: [
      ['person', 'people']
    ]
  });

  equal(inflector.singularize('person'), 'person');
});

test('plural',function(){
  expect(1);

  var inflector = new Ember.Inflector({
    plurals: [
      ['1', '1'],
      ['2', '2'],
      ['3', '3']
    ]
  });

  equal(inflector.rules.plurals.length, 3);
});

test('singular',function(){
  expect(1);

  var inflector = new Ember.Inflector({
    singular: [
      ['1', '1'],
      ['2', '2'],
      ['3', '3']
    ]
  });

  equal(inflector.rules.singular.length, 3);
});

test('irregular',function(){
  expect(6);

  var inflector = new Ember.Inflector({
    irregularPairs: [
      ['1', '12'],
      ['2', '22'],
      ['3', '32']
    ]
  });

  equal(inflector.rules.irregular['1'], '12');
  equal(inflector.rules.irregular['2'], '22');
  equal(inflector.rules.irregular['3'], '32');

  equal(inflector.rules.irregularInverse['12'], '1');
  equal(inflector.rules.irregularInverse['22'], '2');
  equal(inflector.rules.irregularInverse['32'], '3');
});

test('uncountable',function(){
  expect(3);

  var inflector = new Ember.Inflector({
    uncountable: [
      '1',
      '2',
      '3'
    ]
  });

  equal(inflector.rules.uncountable['1'], true);
  equal(inflector.rules.uncountable['2'], true);
  equal(inflector.rules.uncountable['3'], true);
});

test('inflect.nothing', function(){
  expect(2);

  var inflector = new Ember.Inflector();

  equal(inflector.inflect('',  []), '');
  equal(inflector.inflect(' ', []), ' ');
});

test('inflect.noRules',function(){
  expect(1);

  var inflector = new Ember.Inflector();

  equal(inflector.inflect('word', []),'word');
});

test('inflect.uncountable', function(){
  expect(1);

  var inflector = new Ember.Inflector({
    plural: [
      [/$/,'s']
    ],
    uncountable: [
      'word'
    ]
  });

  var rules = [];

  equal(inflector.inflect('word', rules), 'word');
});

test('inflect.irregular', function(){
  expect(2);

  var inflector = new Ember.Inflector({
    irregularPairs: [
      ['word', 'wordy']
    ]
  });

  var rules = [];

  equal(inflector.inflect('word', rules, inflector.rules.irregular), 'wordy');
  equal(inflector.inflect('wordy', rules, inflector.rules.irregularInverse), 'word');
});

test('inflect.basicRules', function(){
  expect(1);

  var inflector = new Ember.Inflector();
  var rules = [[/$/, 's']];

  equal(inflector.inflect('word', rules ), 'words');
});

test('inflect.advancedRules', function(){
  expect(1);

  var inflector = new Ember.Inflector();
  var rules = [[/^(ox)$/i, '$1en']];

  equal(inflector.inflect('ox', rules), 'oxen');
});
