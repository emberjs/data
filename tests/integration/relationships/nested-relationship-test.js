import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, serializer, Elder, MiddleAger, Kid;
const { get, run } = Ember;

var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;

module('integration/relationships/nested_relationships_test - Nested relationships', {
  beforeEach() {
    Elder = DS.Model.extend({
      name: attr('string'),
      middleAgers: hasMany('middle-ager')
    });

    MiddleAger = DS.Model.extend({
      name: attr('string'),
      elder: belongsTo('elder'),
      kids: hasMany('kid')
    });

    Kid = DS.Model.extend({
      name: attr('string'),
      middleAger: belongsTo('middle-ager')
    });

    env = setupStore({
      elder: Elder,
      'middle-ager': MiddleAger,
      kid: Kid,
      adapter: DS.JSONAPIAdapter
    });

    store = env.store;
    serializer = env.serializer;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test("Sideloaded nested relationships load correctly", function(assert) {
  run(function () {
    serializer.pushPayload(store, {
      "data":[
        {
          "id":"1",
          "type":"kids",
          "links":{
            "self":"/kids/1"
          },
          "attributes":{
            "name":"Kid 1"
          },
          "relationships":{
            "middle-ager":{
              "links":{
                "self":"/kids/1/relationships/middle-ager",
                "related":"/kids/1/middle-ager"
              },
              "data":{
                "type":"middle-agers",
                "id":"1"
              }
            }
          }
        }
      ],
      "included":[
        {
          "id":"1",
          "type":"middle-agers",
          "links":{
            "self":"/middle-ager/1"
          },
          "attributes":{
            "name":"Middle Ager 1"
          },
          "relationships":{
            "elder":{
              "links":{
                "self":"/middle-agers/1/relationships/elder",
                "related":"/middle-agers/1/elder"
              },
              "data":{
                "type":"elders",
                "id":"1"
              }
            },
            "kids":{
              "links":{
                "self":"/middle-agers/1/relationships/kids",
                "related":"/middle-agers/1/kids"
              }
            }
          }
        },
        {
          "id":"1",
          "type":"elders",
          "links":{
            "self":"/elders/1"
          },
          "attributes":{
            "name":"Elder 1"
          },
          "relationships":{
            "middle-agers":{
              "links":{
                "self":"/elders/1/relationships/middle-agers",
                "related":"/elders/1/middle-agers"
              }
            }
          }
        }
      ]
    });
  });
  run(function() {
    var kid = store.peekRecord('kid', 1);
    kid.get('middleAger').then(function(middleAger) {
      assert.ok(middleAger, 'MiddleAger relationship was set up correctly');
      var middleAgerName = get(middleAger, 'name');
      assert.equal(middleAgerName, 'Middle Ager 1', 'MiddleAger name is there');
    });
    kid.get('middleAger.elder').then(function(elder) {
      assert.ok(elder, 'Elder relationship was set up correctly');
      var elderName = get(elder, 'name');
      assert.equal(elderName, 'Elder 1', 'Elder name is there');
    });
  });
});

