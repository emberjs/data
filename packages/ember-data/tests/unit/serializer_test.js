var serializer;

module("DS.Serializer", {
  setup: function() {
    serializer = DS.Serializer.create();
  },

  teardown: function() {
    serializer.destroy();
  }
});

test("can configure any plural", function() {
  serializer.configure('plurals', {
    person: 'people',
    system_criterion: 'system_criteria'
  });

  equal(serializer.pluralize('person'), 'people');
  equal(serializer.pluralize('system_criterion'), 'system_criteria');

  equal(serializer.singularize('people'), 'person');
  equal(serializer.singularize('system_criteria'), 'system_criterion');
});

test("can guess plural/singular based on last word(s)", function() {
  serializer.configure('plurals', {
    criterion: 'criteria',
    happy_person: 'happy_people'
  });

  equal(serializer.pluralize('system_criterion'), 'system_criteria');
  equal(serializer.pluralize('crazy_happy_person'), 'crazy_happy_people');

  equal(serializer.singularize('system_criteria'), 'system_criterion');
  equal(serializer.singularize('crazy_happy_people'), 'crazy_happy_person');
});

test("can guess plurals/singulars of common rules", function() {
  equal(serializer.pluralize('test'), 'tests');
  equal(serializer.pluralize('category'), 'categories');
  equal(serializer.pluralize('class'), 'classes');
  equal(serializer.pluralize('box'), 'boxes');
  equal(serializer.pluralize('boy'), 'boys');
  equal(serializer.pluralize('ash'), 'ashes');
  equal(serializer.pluralize('quiz'), 'quizzes');

  equal(serializer.singularize('tests'), 'test');
  equal(serializer.singularize('categories'), 'category');
  equal(serializer.singularize('classes'), 'class');
  equal(serializer.singularize('boxes'), 'box');
  equal(serializer.singularize('boys'), 'boy');
  equal(serializer.singularize('ashes'), 'ash');
  equal(serializer.singularize('quizzes'), 'quiz');
});
