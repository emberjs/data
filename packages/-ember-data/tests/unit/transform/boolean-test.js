import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

module('unit/transform - BooleanTransform', function(hooks) {
  setupTest(hooks);

  test('#serialize', async function(assert) {
    const transform = this.owner.lookup('transform:boolean');

    assert.strictEqual(
      transform.serialize(null, { allowNull: true }),
      null,
      '{ allowNull: true } - we serialize null to null'
    );
    assert.strictEqual(
      transform.serialize(undefined, { allowNull: true }),
      null,
      '{ allowNull: true } - we serialize undefined to null'
    );

    assert.equal(
      transform.serialize(null, { allowNull: false }),
      false,
      '{ allowNull: false } - we serialize null to false'
    );
    assert.equal(
      transform.serialize(undefined, { allowNull: false }),
      false,
      '{ allowNull: false } - we serialize null to false'
    );

    assert.equal(transform.serialize(null, {}), false, 'we serialize null to false');
    assert.equal(transform.serialize(undefined, {}), false, 'we serialize undefined to false');

    assert.equal(transform.serialize(true), true, 'we serialize true to true');
    assert.equal(transform.serialize(false), false, 'we serialize false to false');
  });

  test('#deserialize', async function(assert) {
    const transform = this.owner.lookup('transform:boolean');

    assert.strictEqual(
      transform.deserialize(null, { allowNull: true }),
      null,
      '{ allowNull: true } - we deserialize null to null'
    );
    assert.strictEqual(
      transform.deserialize(undefined, { allowNull: true }),
      null,
      '{ allowNull: true } - we deserialize undefined to null'
    );

    assert.equal(
      transform.deserialize(null, { allowNull: false }),
      false,
      '{ allowNull: false } - we deserialize null to false'
    );
    assert.equal(
      transform.deserialize(undefined, { allowNull: false }),
      false,
      '{ allowNull: true } - we deserialize undefined to false'
    );

    assert.equal(transform.deserialize(null, {}), false, 'we deserialize null to false');
    assert.equal(transform.deserialize(undefined, {}), false, 'we deserialize undefined to false');

    assert.equal(transform.deserialize(true), true, 'we deserialize true to true');
    assert.equal(transform.deserialize(false), false, 'we deserialize false to false');

    assert.equal(transform.deserialize('true'), true, 'we deserialize string "true" to true');
    assert.equal(transform.deserialize('TRUE'), true, 'we deserialize string "TRUE" to true');
    assert.equal(transform.deserialize('false'), false, 'we deserialize string "false" to false');
    assert.equal(transform.deserialize('FALSE'), false, 'we deserialize string "FALSE" to false');

    assert.equal(transform.deserialize('t'), true, 'we deserialize string "t" to true');
    assert.equal(transform.deserialize('T'), true, 'we deserialize string "T" to true');
    assert.equal(transform.deserialize('f'), false, 'we deserialize string "f" to false');
    assert.equal(transform.deserialize('F'), false, 'we deserialize string "F" to false');

    assert.equal(transform.deserialize('1'), true, 'we deserialize string "1" to true');
    assert.equal(transform.deserialize('0'), false, 'we deserialize string "0" to false');

    assert.equal(transform.deserialize(1), true, 'we deserialize number 1 to true');
    assert.equal(transform.deserialize(2), false, 'we deserialize numbers greater than 1 to false');
    assert.equal(transform.deserialize(0), false, 'we deserialize number 0 to false');
  });
});
