/* jshint node:true */
var mountEndpoints = require('json-api-mock-server');

module.exports = function(app, project) {
  var configPath = project.project.configPath();
  var config = require(configPath)(project.environment).mockServer || {};

  // Log proxy requests
  var morgan  = require('morgan');
  app.use(morgan('dev'));

  mountEndpoints(app, config);
};
