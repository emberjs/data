import QUnit from 'qunit';

export default function customQUnitAdapter(socket) {
  QUnit.done(function() {
    let deprecations = QUnit.config.deprecations;
    console.log(deprecations); // eslint-disable-line no-console

    socket.emit('test-metadata', 'deprecations', deprecations);
  });
}
