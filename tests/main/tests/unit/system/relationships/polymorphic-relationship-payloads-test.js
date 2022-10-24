import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/relationships/relationship-payloads-manager (polymorphic)', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');
  });

  test('push one side is polymorphic, baseType then subTypes', function (assert) {
    const User = Model.extend({
      hats: hasMany('hat', { async: false, polymorphic: true, inverse: 'user' }),
    });

    const Hat = Model.extend({
      type: attr('string'),
      user: belongsTo('user', { async: false, inverse: 'hats', as: 'hat' }),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));
    this.owner.register('model:small-hat', Hat.extend({}));

    let id = 1;

    function makeHat(type, props) {
      const resource = deepCopy(props);
      resource.id = `${id++}`;
      resource.type = type;
      resource.attributes.type = type;
      return resource;
    }

    const hatData = {
      attributes: {},
      relationships: {
        user: {
          data: { id: '1', type: 'user' },
        },
      },
    };

    const hatData1 = makeHat('hat', hatData),
      bigHatData1 = makeHat('big-hat', hatData),
      smallHatData1 = makeHat('small-hat', hatData);

    const userData = {
      data: {
        id: '1',
        type: 'user',
        attributes: {},
      },
      included: [hatData1, bigHatData1, smallHatData1],
    };

    const user = run(() => this.store.push(userData));

    const finalResult = user.hats.map((r) => r.type);

    assert.deepEqual(finalResult, ['hat', 'big-hat', 'small-hat'], 'We got all our hats!');
  });

  test('push one side is polymorphic, subType then baseType', function (assert) {
    let User = Model.extend({
      hats: hasMany('hat', { async: false, polymorphic: true, inverse: 'user' }),
    });

    let Hat = Model.extend({
      type: attr('string'),
      user: belongsTo('user', { async: false, inverse: 'hats', as: 'hat' }),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));
    this.owner.register('model:small-hat', Hat.extend({}));

    let id = 1;

    function makeHat(type, props) {
      const resource = deepCopy(props);
      resource.id = `${id++}`;
      resource.type = type;
      resource.attributes.type = type;
      return resource;
    }

    const hatData = {
      attributes: {},
      relationships: {
        user: {
          data: { id: '1', type: 'user' },
        },
      },
    };

    const bigHatData1 = makeHat('hat', hatData),
      smallHatData1 = makeHat('small-hat', hatData),
      hatData1 = makeHat('big-hat', hatData),
      included = [bigHatData1, smallHatData1, hatData1];

    const userData = {
      data: {
        id: '1',
        type: 'user',
        attributes: {},
      },
      included,
    };

    const user = run(() => this.store.push(userData)),
      finalResult = user.hats.map((r) => r.type),
      expectedResults = included.map((m) => m.type);

    assert.deepEqual(finalResult, expectedResults, 'We got all our hats!');
  });

  test('push one side is polymorphic, different subtypes', function (assert) {
    let User = Model.extend({
      hats: hasMany('hat', { async: false, polymorphic: true, inverse: 'user' }),
    });

    let Hat = Model.extend({
      type: attr('string'),
      user: belongsTo('user', { async: false, inverse: 'hats', as: 'hat' }),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));
    this.owner.register('model:small-hat', Hat.extend({}));

    let id = 1;

    function makeHat(type, props) {
      const resource = deepCopy(props);
      resource.id = `${id++}`;
      resource.type = type;
      resource.attributes.type = type;
      return resource;
    }

    const hatData = {
      attributes: {},
      relationships: {
        user: {
          data: { id: '1', type: 'user' },
        },
      },
    };

    const bigHatData1 = makeHat('big-hat', hatData),
      smallHatData1 = makeHat('small-hat', hatData),
      bigHatData2 = makeHat('big-hat', hatData),
      smallHatData2 = makeHat('small-hat', hatData),
      included = [bigHatData1, smallHatData1, bigHatData2, smallHatData2];

    const userData = {
      data: {
        id: '1',
        type: 'user',
        attributes: {},
      },
      included,
    };

    const user = run(() => this.store.push(userData)),
      finalResult = user.hats.map((r) => r.type),
      expectedResults = included.map((m) => m.type);

    assert.deepEqual(finalResult, expectedResults, 'We got all our hats!');
  });

  test('push both sides are polymorphic', function (assert) {
    let User = Model.extend({
      hats: hasMany('hat', { async: false, polymorphic: true, as: 'user', inverse: 'user' }),
    });

    let Hat = Model.extend({
      type: attr('string'),
      user: belongsTo('user', { async: false, inverse: 'hats', polymorphic: true, as: 'hat' }),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:alien', User.extend({}));
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));
    this.owner.register('model:small-hat', Hat.extend({}));

    let id = 1;

    function makeHat(type, props) {
      const resource = deepCopy(props);
      resource.id = `${id++}`;
      resource.type = type;
      resource.attributes.type = type;
      return resource;
    }

    const alienHatData = {
      attributes: {},
      relationships: {
        user: {
          data: { id: '1', type: 'alien' },
        },
      },
    };

    const bigHatData1 = makeHat('hat', alienHatData),
      hatData1 = makeHat('big-hat', alienHatData),
      alienIncluded = [bigHatData1, hatData1];

    const alienData = {
      data: {
        id: '1',
        type: 'alien',
        attributes: {},
      },
      included: alienIncluded,
    };

    const expectedAlienResults = alienIncluded.map((m) => m.type),
      alien = run(() => this.store.push(alienData)),
      alienFinalHats = alien.hats.map((r) => r.type);

    assert.deepEqual(alienFinalHats, expectedAlienResults, 'We got all alien hats!');
  });

  test('handles relationships where both sides are polymorphic', function (assert) {
    let Person = Model.extend({
      hats: hasMany('hat', {
        async: false,
        polymorphic: true,
        inverse: 'person',
        as: 'person',
      }),
    });

    let Hat = Model.extend({
      type: attr('string'),
      person: belongsTo('person', {
        async: false,
        inverse: 'hats',
        polymorphic: true,
        as: 'hat',
      }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:big-person', Person.extend({}));
    this.owner.register('model:small-person', Person.extend({}));
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));
    this.owner.register('model:small-hat', Hat.extend({}));

    let id = 1;
    function makePolymorphicHatForPolymorphicPerson(type, isForBigPerson = true) {
      return {
        id: `${id++}`,
        type,
        relationships: {
          person: {
            data: {
              id: isForBigPerson ? '1' : '2',
              type: isForBigPerson ? 'big-person' : 'small-person',
            },
          },
        },
      };
    }

    const bigHatData1 = makePolymorphicHatForPolymorphicPerson('big-hat');
    const bigHatData2 = makePolymorphicHatForPolymorphicPerson('big-hat');
    const bigHatData3 = makePolymorphicHatForPolymorphicPerson('big-hat', false);
    const smallHatData1 = makePolymorphicHatForPolymorphicPerson('small-hat');
    const smallHatData2 = makePolymorphicHatForPolymorphicPerson('small-hat');
    const smallHatData3 = makePolymorphicHatForPolymorphicPerson('small-hat', false);

    const bigPersonData = {
      data: {
        id: '1',
        type: 'big-person',
        attributes: {},
      },
      included: [bigHatData1, smallHatData1, bigHatData2, smallHatData2],
    };

    const smallPersonData = {
      data: {
        id: '2',
        type: 'small-person',
        attributes: {},
      },
      included: [bigHatData3, smallHatData3],
    };

    const bigPerson = run(() => {
      return this.store.push(bigPersonData);
    });

    const smallPerson = run(() => {
      return this.store.push(smallPersonData);
    });

    const finalBigResult = bigPerson.hats.slice();
    const finalSmallResult = smallPerson.hats.slice();

    assert.strictEqual(finalBigResult.length, 4, 'We got all our hats!');
    assert.strictEqual(finalSmallResult.length, 2, 'We got all our hats!');
  });

  test('handles relationships where both sides are polymorphic reflexive', function (assert) {
    function link(a, b, relationshipName, recurse = true) {
      a.relationships = a.relationships || {};
      const rel = (a.relationships[relationshipName] = a.relationships[relationshipName] || {});

      if (Array.isArray(b)) {
        rel.data = b.map((i) => {
          let { type, id } = i;

          if (recurse === true) {
            link(i, [a], relationshipName, false);
          }

          return { type, id };
        });
      } else {
        rel.data = {
          type: b.type,
          id: b.id,
        };

        if (recurse === true) {
          link(b, a, relationshipName, false);
        }
      }
    }

    let Person = Model.extend({
      name: attr(),
      family: hasMany('person', { async: false, polymorphic: true, inverse: 'family', as: 'person' }),
      twin: belongsTo('person', { async: false, polymorphic: true, inverse: 'twin', as: 'person' }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:girl', Person.extend({}));
    this.owner.register('model:boy', Person.extend({}));
    this.owner.register('model:grownup', Person.extend({}));

    let id = 1;

    const brotherPayload = {
      type: 'boy',
      id: `${id++}`,
      attributes: {
        name: 'Gavin',
      },
    };
    const sisterPayload = {
      type: 'girl',
      id: `${id++}`,
      attributes: {
        name: 'Rose',
      },
    };
    const fatherPayload = {
      type: 'grownup',
      id: `${id++}`,
      attributes: {
        name: 'Garak',
      },
    };
    const motherPayload = {
      type: 'grownup',
      id: `${id++}`,
      attributes: {
        name: 'Kira',
      },
    };

    link(brotherPayload, sisterPayload, 'twin');
    link(brotherPayload, [sisterPayload, fatherPayload, motherPayload], 'family');

    const payload = {
      data: brotherPayload,
      included: [sisterPayload, fatherPayload, motherPayload],
    };
    const expectedFamilyReferences = [
      { type: 'girl', id: sisterPayload.id },
      { type: 'grownup', id: fatherPayload.id },
      { type: 'grownup', id: motherPayload.id },
    ];
    const expectedTwinReference = { type: 'girl', id: sisterPayload.id };

    const boyInstance = run(() => {
      return this.store.push(payload);
    });

    const familyResultReferences = boyInstance.family.slice().map((i) => {
      return { type: i.constructor.modelName, id: i.id };
    });
    const twinResult = boyInstance.twin;
    const twinResultReference = { type: twinResult.constructor.modelName, id: twinResult.id };

    assert.deepEqual(familyResultReferences, expectedFamilyReferences, 'We linked family correctly');
    assert.deepEqual(twinResultReference, expectedTwinReference, 'We linked twin correctly');
  });

  test('handles relationships where both sides are polymorphic reflexive but the primary payload does not include linkage', function (assert) {
    function link(a, b, relationshipName, recurse = true) {
      a.relationships = a.relationships || {};
      const rel = (a.relationships[relationshipName] = a.relationships[relationshipName] || {});

      if (Array.isArray(b)) {
        rel.data = b.map((i) => {
          let { type, id } = i;

          if (recurse === true) {
            link(i, [a], relationshipName, false);
          }

          return { type, id };
        });
      } else {
        rel.data = {
          type: b.type,
          id: b.id,
        };

        if (recurse === true) {
          link(b, a, relationshipName, false);
        }
      }
    }

    const Person = Model.extend({
      name: attr(),
      family: hasMany('person', { async: false, polymorphic: true, as: 'person', inverse: 'family' }),
      twin: belongsTo('person', { async: false, polymorphic: true, as: 'person', inverse: 'twin' }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:girl', Person.extend({}));
    this.owner.register('model:boy', Person.extend({}));
    this.owner.register('model:grownup', Person.extend({}));

    let id = 1;

    const brotherPayload = {
      type: 'boy',
      id: `${id++}`,
      attributes: {
        name: 'Gavin',
      },
    };
    const sisterPayload = {
      type: 'girl',
      id: `${id++}`,
      attributes: {
        name: 'Rose',
      },
    };
    const fatherPayload = {
      type: 'grownup',
      id: `${id++}`,
      attributes: {
        name: 'Garak',
      },
    };
    const motherPayload = {
      type: 'grownup',
      id: `${id++}`,
      attributes: {
        name: 'Kira',
      },
    };

    link(brotherPayload, sisterPayload, 'twin');
    link(brotherPayload, [sisterPayload, fatherPayload, motherPayload], 'family');

    // unlink all relationships from the primary payload
    delete brotherPayload.relationships;

    const payload = {
      data: brotherPayload,
      included: [sisterPayload, fatherPayload, motherPayload],
    };
    const expectedFamilyReferences = [
      { type: 'girl', id: sisterPayload.id },
      { type: 'grownup', id: fatherPayload.id },
      { type: 'grownup', id: motherPayload.id },
    ];
    const expectedTwinReference = { type: 'girl', id: sisterPayload.id };

    const boyInstance = run(() => {
      return this.store.push(payload);
    });

    const familyResultReferences = boyInstance.family.slice().map((i) => {
      return { type: i.constructor.modelName, id: i.id };
    });
    const twinResult = boyInstance.twin;
    const twinResultReference = twinResult && {
      type: twinResult.constructor.modelName,
      id: twinResult.id,
    };

    assert.deepEqual(familyResultReferences, expectedFamilyReferences, 'We linked family correctly');
    assert.deepEqual(twinResultReference, expectedTwinReference, 'We linked twin correctly');
  });

  test('push polymorphic self-referential non-reflexive relationship', function (assert) {
    let Hat = Model.extend({
      type: attr('string'),
      hat: belongsTo('hat', { async: false, inverse: 'hats', polymorphic: true, as: 'hat' }),
      hats: hasMany('hat', { async: false, inverse: 'hat', polymorphic: true, as: 'hat' }),
    });

    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));

    const hat1Data = {
      data: {
        id: '1',
        type: 'big-hat',
        attributes: {},
      },
    };
    const hat2Data = {
      data: {
        id: '2',
        type: 'big-hat',
        attributes: {},
        relationships: {
          hats: {
            data: [{ id: '1', type: 'big-hat' }],
          },
        },
      },
    };

    const hat1 = run(() => this.store.push(hat1Data));
    const hat2 = run(() => this.store.push(hat2Data));

    const expectedHatReference = { id: '2', type: 'big-hat' };
    const expectedHatsReferences = [{ id: '1', type: 'big-hat' }];

    const finalHatsReferences = hat2.hats.slice().map((i) => {
      return { type: i.constructor.modelName, id: i.id };
    });
    const hatResult = hat1.hat;
    const finalHatReference = hatResult && {
      type: hatResult.constructor.modelName,
      id: hatResult.id,
    };

    assert.deepEqual(finalHatReference, expectedHatReference, 'we set hat on hat:1');
    assert.deepEqual(finalHatsReferences, expectedHatsReferences, 'We have hats on hat:2');
  });

  test('push polymorphic self-referential circular non-reflexive relationship', function (assert) {
    let Hat = Model.extend({
      type: attr('string'),
      hat: belongsTo('hat', { async: false, inverse: 'hats', polymorphic: true, as: 'hat' }),
      hats: hasMany('hat', { async: false, inverse: 'hat', polymorphic: true, as: 'hat' }),
    });

    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));

    const hatData = {
      data: {
        id: '1',
        type: 'big-hat',
        attributes: {},
        relationships: {
          hat: {
            data: { id: '1', type: 'big-hat' },
          },
          hats: {
            data: [{ id: '1', type: 'big-hat' }],
          },
        },
      },
    };

    const hat = run(() => this.store.push(hatData));

    const expectedHatReference = { id: '1', type: 'big-hat' };
    const expectedHatsReferences = [{ id: '1', type: 'big-hat' }];

    const finalHatsReferences = hat.hats.slice().map((i) => {
      return { type: i.constructor.modelName, id: i.id };
    });
    const hatResult = hat.hat;
    const finalHatReference = hatResult && {
      type: hatResult.constructor.modelName,
      id: hatResult.id,
    };

    assert.deepEqual(finalHatReference, expectedHatReference, 'we set hat on hat:1');
    assert.deepEqual(finalHatsReferences, expectedHatsReferences, 'We have hats on hat:2');
  });

  test('polymorphic hasMany to types with separate id-spaces', function (assert) {
    let User = Model.extend({
      hats: hasMany('hat', { async: false, polymorphic: true, inverse: 'user', as: 'user' }),
    });

    let Hat = Model.extend({
      type: attr('string'),
      user: belongsTo('user', { async: false, inverse: 'hats', polymorphic: true, as: 'hat' }),
    });

    let BigHat = Hat.extend({});
    let SmallHat = Hat.extend({});

    this.owner.register('model:user', User);
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', BigHat);
    this.owner.register('model:small-hat', SmallHat);

    const user = run(() =>
      this.store.push({
        data: {
          id: '1',
          type: 'user',
          relationships: {
            hats: {
              data: [
                { id: '1', type: 'big-hat' },
                { id: '1', type: 'small-hat' },
              ],
            },
          },
        },
        included: [
          {
            id: '1',
            type: 'big-hat',
          },
          {
            id: '1',
            type: 'small-hat',
          },
        ],
      })
    );

    const hats = user.hats;

    assert.deepEqual(
      hats.map((h) => h.constructor.modelName),
      ['big-hat', 'small-hat']
    );
    assert.deepEqual(
      hats.map((h) => h.id),
      ['1', '1']
    );
  });

  test('polymorphic hasMany to types with separate id-spaces, from inverse payload', function (assert) {
    let User = Model.extend({
      hats: hasMany('hat', { async: false, polymorphic: true, inverse: 'user', as: 'user' }),
    });

    let Hat = Model.extend({
      type: attr('string'),
      user: belongsTo('user', { async: false, inverse: 'hats', polymorphic: true, as: 'hat' }),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));
    this.owner.register('model:small-hat', Hat.extend({}));

    const user = run(() =>
      this.store.push({
        data: {
          id: '1',
          type: 'user',
        },
        included: [
          {
            id: '1',
            type: 'big-hat',
            relationships: {
              user: {
                data: { id: '1', type: 'user' },
              },
            },
          },
          {
            id: '1',
            type: 'small-hat',
            relationships: {
              user: {
                data: { id: '1', type: 'user' },
              },
            },
          },
        ],
      })
    );

    const hats = user.hats;

    assert.deepEqual(
      hats.map((h) => h.constructor.modelName),
      ['big-hat', 'small-hat']
    );
    assert.deepEqual(
      hats.map((h) => h.id),
      ['1', '1']
    );
  });

  test('polymorphic hasMany to polymorphic hasMany types with separate id-spaces', function (assert) {
    let Person = Model.extend({
      hats: hasMany('hat', {
        async: false,
        polymorphic: true,
        inverse: 'person',
        as: 'person',
      }),
    });

    let Hat = Model.extend({
      type: attr('string'),
      person: belongsTo('person', {
        async: false,
        inverse: 'hats',
        polymorphic: true,
        as: 'hat',
      }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:big-person', Person.extend({}));
    this.owner.register('model:small-person', Person.extend({}));
    this.owner.register('model:hat', Hat);
    this.owner.register('model:big-hat', Hat.extend({}));
    this.owner.register('model:small-hat', Hat.extend({}));

    let bigHatId = 1;
    let smallHatId = 1;
    function makePolymorphicHatForPolymorphicPerson(type, isForBigPerson = true) {
      const isSmallHat = type === 'small-hat';
      return {
        id: `${isSmallHat ? smallHatId++ : bigHatId++}`,
        type,
        relationships: {
          person: {
            data: {
              id: '1',
              type: isForBigPerson ? 'big-person' : 'small-person',
            },
          },
        },
      };
    }

    const bigHatData1 = makePolymorphicHatForPolymorphicPerson('big-hat');
    const bigHatData2 = makePolymorphicHatForPolymorphicPerson('big-hat');
    const bigHatData3 = makePolymorphicHatForPolymorphicPerson('big-hat', false);
    const smallHatData1 = makePolymorphicHatForPolymorphicPerson('small-hat');
    const smallHatData2 = makePolymorphicHatForPolymorphicPerson('small-hat');
    const smallHatData3 = makePolymorphicHatForPolymorphicPerson('small-hat', false);

    const bigPersonData = {
      data: {
        id: '1',
        type: 'big-person',
        attributes: {},
      },
      included: [bigHatData1, smallHatData1, bigHatData2, smallHatData2],
    };

    const smallPersonData = {
      data: {
        id: '1',
        type: 'small-person',
        attributes: {},
      },
      included: [bigHatData3, smallHatData3],
    };

    const bigPerson = run(() => {
      return this.store.push(bigPersonData);
    });

    const smallPerson = run(() => {
      return this.store.push(smallPersonData);
    });

    const finalBigResult = bigPerson.hats.slice();
    const finalSmallResult = smallPerson.hats.slice();

    assert.deepEqual(
      finalBigResult.map((h) => ({ type: h.constructor.modelName, id: h.id })),
      [
        { type: 'big-hat', id: '1' },
        { type: 'small-hat', id: '1' },
        { type: 'big-hat', id: '2' },
        { type: 'small-hat', id: '2' },
      ],
      'big-person hats is all good'
    );

    assert.deepEqual(
      finalSmallResult.map((h) => ({ type: h.constructor.modelName, id: h.id })),
      [
        { type: 'big-hat', id: '3' },
        { type: 'small-hat', id: '3' },
      ],
      'small-person hats is all good'
    );
  });

  testInDebug('Invalid inverses throw errors', function (assert) {
    this.owner.register(
      'model:post',
      Model.extend({
        comments: hasMany('comment', { async: false, inverse: 'post' }),
      })
    );

    this.owner.register(
      'model:comment',
      Model.extend({
        post: belongsTo('post', { async: false, inverse: null }),
      })
    );

    let runInvalidPush = () => {
      return run(() => {
        return this.store.push({
          data: {
            type: 'post',
            id: '1',
            relationships: {
              comments: {
                data: [{ type: 'comment', id: '1' }],
              },
            },
          },
          included: [
            {
              type: 'comment',
              id: '1',
              relationships: {
                post: {
                  data: {
                    type: 'post',
                    id: '1',
                  },
                },
              },
            },
          ],
        });
      });
    };

    assert.expectAssertion(
      runInvalidPush,
      /The comment:post relationship declares 'inverse: null', but it was resolved as the inverse for post:comments/,
      'We detected the invalid inverse'
    );
  });
});
