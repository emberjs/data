var emberDataVersion = require('../../lib/utilities/ember-data-version.js');
module.exports = {
  bower: {
    src: 'config/package_manager_files/*', dest: 'dist/', flatten: true, expand: true,
    options: {
      process: function (content, srcpath) {
        return content.replace(/VERSION_STRING_PLACEHOLDER/g, emberDataVersion());
      }
    }
  }
};
