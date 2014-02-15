var lockFile = require('lockfile');
var lockMiddleware = function(req, res, next) {
  if (!lockFile.checkSync(__dirname + '/../../tmp/connect.lock')) {
    return next();
  } else {
    setTimeout(function(){
      lockMiddleware(req, res, next);
    }, 10);
  }
};


var port = process.env.PORT || '9997';
module.exports = {
  main: {
    options: {
      port: port,
      base: '.',
      middleware: function(connect, options){
        var base = options.base;
        return [ lockMiddleware, connect.static(base), connect.directory(base) ];
      }
    }
  }
};
