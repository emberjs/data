var faker = require('faker');
var props = require('json-api-mock-server/lib/store/props');
var attr = props.attr;
var between = require('json-api-mock-server/lib/utils/between');

module.exports = {
  title: attr('string', { defaultValue: function() { return faker.lorem.words(between(3, 7)); }}),
  description: attr('string', { defaultValue: function() { return faker.lorem.sentences(between(3, 7)); }})
};
