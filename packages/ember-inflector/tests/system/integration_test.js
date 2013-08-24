module("ember-inflector.integration");

test("pluralize", function(){
  expect(3);

  equal(Ember.String.pluralize('word'),     'words');
  equal(Ember.String.pluralize('ox'),       'oxen');
  equal(Ember.String.pluralize('octopus'),  'octopi');
});

test("singularize", function(){
  expect(3);

  equal(Ember.String.singularize('words'),  'word');
  equal(Ember.String.singularize('oxen'),   'ox');
  equal(Ember.String.singularize('octopi'), 'octopus');
});
