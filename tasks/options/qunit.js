module.exports = {
  local: {
    options: {
      urls: [ 'http://localhost:9997/tests/index.html' ]
    }
  },
  release: {
    options: {
      urls: [ 'http://localhost:9997/tests/index.html?emberchannel=release' ]
    }
  },
  beta: {
    options: {
      urls: [ 'http://localhost:9997/tests/index.html?emberchannel=beta' ]
    }
  },
  canary: {
    options: {
      urls: [ 'http://localhost:9997/tests/index.html?emberchannel=canary' ]
    }
  }
};
