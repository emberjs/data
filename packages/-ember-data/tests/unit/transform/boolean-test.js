import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

module('unit/transform - BooleanTransform', function (hooks) {
  setupTest(hooks);

  test('#serialize', async function (assert) {
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

    assert.false(transform.serialize(null, { allowNull: false }), '{ allowNull: false } - we serialize null to false');
    assert.false(
      transform.serialize(undefined, { allowNull: false }),
      '{ allowNull: false } - we serialize null to false'
    );

    assert.false(transform.serialize(null, {}), 'we serialize null to false');
    assert.false(transform.serialize(undefined, {}), 'we serialize undefined to false');

    assert.true(transform.serialize(true), 'we serialize true to true');
    assert.false(transform.serialize(false), 'we serialize false to false');
  });

  test('#deserialize', async function (assert) {
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

    assert.false(
      transform.deserialize(null, { allowNull: false }),
      '{ allowNull: false } - we deserialize null to false'
    );
    assert.false(
      transform.deserialize(undefined, { allowNull: false }),
      '{ allowNull: true } - we deserialize undefined to false'
    );

    assert.false(transform.deserialize(null, {}), 'we deserialize null to false');
    assert.false(transform.deserialize(undefined, {}), 'we deserialize undefined to false');

    assert.true(transform.deserialize(true), 'we deserialize true to true');
    assert.false(transform.deserialize(false), 'we deserialize false to false');

    assert.true(transform.deserialize('true'), 'we deserialize string "true" to true');
    assert.true(transform.deserialize('TRUE'), 'we deserialize string "TRUE" to true');
    assert.false(transform.deserialize('false'), 'we deserialize string "false" to false');
    assert.false(transform.deserialize('FALSE'), 'we deserialize string "FALSE" to false');

    assert.true(transform.deserialize('t'), 'we deserialize string "t" to true');
    assert.true(transform.deserialize('T'), 'we deserialize string "T" to true');
    assert.false(transform.deserialize('f'), 'we deserialize string "f" to false');
    assert.false(transform.deserialize('F'), 'we deserialize string "F" to false');

    assert.true(transform.deserialize('1'), 'we deserialize string "1" to true');
    assert.false(transform.deserialize('0'), 'we deserialize string "0" to false');

    assert.true(transform.deserialize(1), 'we deserialize number 1 to true');
    assert.false(transform.deserialize(2), 'we deserialize numbers greater than 1 to false');
    assert.false(transform.deserialize(0), 'we deserialize number 0 to false');
  });
});
