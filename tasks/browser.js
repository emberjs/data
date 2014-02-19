module.exports = function(grunt) {
  grunt.registerMultiTask('browser', 'Export the object in <%= pkg.name %> to the window', function() {
    this.files.forEach(function(f) {
      var output = ['(function(global) {'];
      output.push.apply(output, f.src.map(grunt.file.read));
      output.push("global.<%= pkg.namespace %> = requireModule('<%= pkg.name %>/lib/main')['default'];");
      output.push('}(window));');
      var banner = grunt.template.process(grunt.file.read(__dirname + "/../generators/license.js"));
      grunt.file.write(f.dest, banner + grunt.template.process(output.join('\n')));
    });
  });
};
