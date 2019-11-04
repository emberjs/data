const zlib = require('zlib');
const TablePads = {
  name: 45,
  bytes: 9,
  compressedBytes: 10,
  percentOfPackage: 13,
};
const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
  },
};

function getCompressedSize(code) {
  return Buffer.byteLength(zlib.brotliCompressSync(code, BROTLI_OPTIONS));
}

class Library {
  constructor(name) {
    this.name = name;
    this.packages = [];
    this._packageMap = {};
    this._concatModule = '';
    this._compressedSize = null;
  }
  getPackage(name) {
    let pkg = this._packageMap[name];

    if (!pkg) {
      pkg = this._packageMap[name] = new Package(name, this);
      this.packages.push(pkg);
    }

    return pkg;
  }
  get concatModule() {
    return this._concatModule;
  }
  get absoluteSize() {
    return byteCount(this.concatModule);
  }
  get compressedSize() {
    return this._compressedSize || (this._compressedSize = getCompressedSize(this.concatModule));
  }
  sort() {
    this.packages = this.packages.sort((a, b) => {
      return a.compressedSize > b.compressedSize ? -1 : 1;
    });
    this.packages.forEach(p => p.sort());
  }
  print(showModules) {
    console.log('\n\nAsset Size Report');
    console.log('=================\n\n');

    console.log(`Library: ${this.name}`);
    console.table({
      bytes: formatBytes(this.absoluteSize),
      compressed: formatBytes(this.compressedSize),
      packages: this.packages.length,
      modules: this.packages.reduce((v, c) => v + c.modules.length, 0),
    });
    this.packages.forEach(p => p.print());
    if (showModules) {
      this.packages.forEach(p => {
        p.modules.forEach(m => {
          console.log('\n\n');
          console.log(m.code);
        });
      });
    }
  }
  toJSON() {
    return {
      name: this.name,
      packages: this.packages,
    };
  }

  static fromData(data) {
    const library = new Library(data.name);
    data.packages.forEach(p => {
      const pkg = library.getPackage(p.name);
      p.modules.forEach(m => {
        pkg.addModule(m.name, m.code);
      });
    });
    return library;
  }
}

class Package {
  constructor(name, library) {
    this.name = name;
    this.library = library;
    this.modules = [];
    this._concatModule = '';
  }
  addModule(name, code) {
    let mod = new Module(name, this, code);
    this.modules.push(mod);
    this._concatModule += code;
    this.library._concatModule += code;
    return mod;
  }
  get concatModule() {
    return this._concatModule;
  }
  get absoluteSize() {
    return byteCount(this.concatModule);
  }
  get compressedSize() {
    return (
      Math.floor((this.concatModule.length / this.library.concatModule.length) * this.library.compressedSize * 100) /
      100
    );
  }
  get percentOfLibrary() {
    return getRelativeSizeOf(this.library, this);
  }
  sort() {
    this.modules = this.modules.sort((a, b) => {
      return a.compressedSize > b.compressedSize ? -1 : 1;
    });
  }
  print() {
    console.log('\nPackage: ' + this.name);
    console.table({
      bytes: formatBytes(this.absoluteSize),
      compressed: formatBytes(this.compressedSize),
      '% Of Library': this.percentOfLibrary,
    });
    console.log(
      `\t${rightPad('Module', TablePads.name)} | ` +
        `${rightPad('Bytes', TablePads.bytes)} | ` +
        `${rightPad('Compressed', TablePads.compressedBytes)} | ` +
        `${rightPad('% of Package', TablePads.percentOfPackage)} | ` +
        `% Of Library`
    );
    console.log(
      '\t-----------------------------------------------------------------------------------------------------'
    );
    this.modules.forEach(s => s.print());
  }
  toJSON() {
    return {
      name: this.name,
      modules: this.modules,
    };
  }
}

class Module {
  constructor(name, pkg, code) {
    this.name = name;
    this.package = pkg;
    this.code = code;
  }
  get size() {
    return this.code.length;
  }
  get absoluteSize() {
    return byteCount(this.code);
  }
  get compressedSize() {
    return (
      Math.floor((this.size / this.package.library.concatModule.length) * this.package.library.compressedSize * 100) /
      100
    );
  }
  get bytes() {
    return formatBytes(this.absoluteSize);
  }
  get compressedBytes() {
    return formatBytes(this.compressedSize);
  }
  get percentOfPackage() {
    return getRelativeSizeOf(this.package, this);
  }
  get percentOfLibrary() {
    return getRelativeSizeOf(this.package.library, this);
  }
  print() {
    console.log(
      '\t' +
        rightPad(this.name, TablePads.name) +
        ' | ' +
        rightPad(this.bytes, TablePads.bytes) +
        ' | ' +
        rightPad(this.compressedBytes, TablePads.compressedBytes) +
        ' | ' +
        rightPad(this.percentOfPackage, TablePads.percentOfPackage) +
        ' | ' +
        this.percentOfLibrary
    );
  }
  toJSON() {
    return {
      name: this.name,
      code: this.code,
    };
  }
}

function rightPad(str, len, char = ' ') {
  while (str.length < len) {
    str += char;
  }
  return str;
}

function getRelativeSizeOf(base, component) {
  const { absoluteSize } = component;
  const { absoluteSize: totalSize } = base;

  return `${per(absoluteSize, totalSize)}`;
}

function per(size, total) {
  return ((size / total) * 100).toFixed(1);
}

function formatBytes(b) {
  let str;
  if (b > 1024) {
    str = (b / 1024).toFixed(2) + ' KB';
  } else {
    str = b + ' B';
  }

  return str;
}

function byteCount(s) {
  return encodeURI(s).split(/%..|./).length - 1;
}

module.exports = Library;
