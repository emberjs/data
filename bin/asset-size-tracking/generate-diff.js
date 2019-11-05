'use strict';

const fs = require('fs');
const path = require('path');
const Library = require('./src/library');
const parseModules = require('./src/parse-modules');
const getBuiltDist = require('./src/get-built-dist');
const chalk = require('chalk');
const library_failure_threshold = 15;
const package_warn_threshold = 0;

let BASE_DATA_FILE = process.argv[2] || false;
let NEW_VENDOR_FILE = process.argv[3] || false;

if (!BASE_DATA_FILE) {
  BASE_DATA_FILE = path.resolve(__dirname, './current-data.json');
}

const data = fs.readFileSync(BASE_DATA_FILE, 'utf-8');
const current_library = Library.fromData(JSON.parse(data));

const builtAsset = getBuiltDist(NEW_VENDOR_FILE);
const new_library = parseModules(builtAsset);

function getDiff(oldLibrary, newLibrary) {
  const diff = {
    name: oldLibrary.name,
    currentSize: oldLibrary.absoluteSize,
    newSize: newLibrary.absoluteSize,
    currentSizeCompressed: oldLibrary.compressedSize,
    newSizeCompressed: newLibrary.compressedSize,
    packages: {},
  };
  oldLibrary.packages.forEach(pkg => {
    diff.packages[pkg.name] = {
      name: pkg.name,
      currentSize: pkg.absoluteSize,
      newSize: 0,
      currentSizeCompressed: pkg.compressedSize,
      newSizeCompressed: 0,
      modules: {},
    };
    let modules = diff.packages[pkg.name].modules;
    pkg.modules.forEach(m => {
      modules[m.name] = {
        name: m.name,
        currentSize: m.absoluteSize,
        newSize: 0,
        currentSizeCompressed: m.compressedSize,
        newSizeCompressed: 0,
      };
    });
  });
  newLibrary.packages.forEach(pkg => {
    diff.packages[pkg.name] = diff.packages[pkg.name] || {
      name: pkg.name,
      currentSize: 0,
      newSize: pkg.absoluteSize,
      currentSizeCompressed: 0,
      newSizeCompressed: pkg.compressedSize,
      modules: {},
    };
    diff.packages[pkg.name].newSize = pkg.absoluteSize;
    diff.packages[pkg.name].newSizeCompressed = pkg.compressedSize;
    let modules = diff.packages[pkg.name].modules;
    pkg.modules.forEach(m => {
      modules[m.name] = modules[m.name] || {
        name: m.name,
        currentSize: 0,
        newSize: m.absoluteSize,
        currentSizeCompressed: 0,
        newSizeCompressed: m.compressedSize,
      };
      modules[m.name].newSize = m.absoluteSize;
      modules[m.name].newSizeCompressed = m.compressedSize;
    });
  });
  diff.packages = Object.values(diff.packages);
  diff.packages.forEach(pkg => {
    pkg.modules = Object.values(pkg.modules);
  });

  return diff;
}

const diff = getDiff(current_library, new_library);

function analyzeDiff(diff) {
  let failures = [];
  let warnings = [];

  if (diff.currentSize < diff.newSize) {
    let delta = diff.newSize - diff.currentSize;
    let compressedDelta = diff.newSizeCompressed - diff.currentSizeCompressed;
    if (delta > library_failure_threshold && compressedDelta > 0) {
      failures.push(
        `The size of the library ${diff.name} has increased by ${formatBytes(delta)} (${formatBytes(
          compressedDelta
        )} compressed) which exceeds the failure threshold of ${library_failure_threshold} bytes.`
      );
    }
  }

  diff.packages.forEach(pkg => {
    if (pkg.currentSize < pkg.newSize) {
      let delta = pkg.newSize - pkg.currentSize;
      if (delta > package_warn_threshold) {
        warnings.push(`The uncompressed size of the package ${pkg.name} has increased by ${formatBytes(delta)}.`);
      }
    }
  });

  return { failures, warnings };
}

function printDiff(diff) {
  console.log('\n```\n');
  printItem(diff);
  diff.packages.forEach(pkg => {
    printItem(pkg, 2);
    pkg.modules.forEach(m => {
      printItem(m, 4);
    });
  });
  console.log('\n```\n');
}

function printItem(item, indent = 0) {
  if (item.currentSize !== item.newSize) {
    const indentColor = indent >= 4 ? 'grey' : indent >= 2 ? 'yellow' : indent >= 0 ? 'magenta' : 'green';
    console.log(
      leftPad(
        chalk[indentColor](item.name) +
          ' ' +
          chalk.white(formatBytes(item.newSize) + ' / ' + formatBytes(item.newSizeCompressed) + ' (compressed)') +
          formatDelta(item),
        indent * 2
      )
    );
  }
}

function formatDelta(item) {
  if (item.currentSizeCompressed === item.newSizeCompressed) {
    return '';
  }
  if (item.currentSizeCompressed > item.newSizeCompressed) {
    return chalk.green(
      ` (- ${formatBytes(item.currentSize - item.newSize)} / - ${formatBytes(
        item.currentSizeCompressed - item.newSizeCompressed
      )} compressed)`
    );
  } else {
    return chalk.red(
      ` (+ ${formatBytes(item.newSize - item.currentSize)} / - ${formatBytes(
        item.newSizeCompressed - item.currentSizeCompressed
      )} compressed)`
    );
  }
}

function formatBytes(b) {
  let str;
  if (b > 1024) {
    str = (b / 1024).toFixed(2) + ' KB';
  } else {
    str = b.toFixed(2) + ' B';
  }

  return str;
}

function leftPad(str, len, char = ' ') {
  for (let i = 0; i < len; i++) {
    str = char + str;
  }
  return str;
}

const { failures, warnings } = analyzeDiff(diff);

if (failures.length) {
  console.log(`\n<details>\n  <summary>${failures[0]}</summary>`);
  if (failures.length > 1) {
    console.log('\nFailed Checks\n-----------------------');
    failures.forEach(f => {
      console.log(f);
    });
  }
  if (warnings.length) {
    console.log('\nWarnings\n-----------------------');
    warnings.forEach(w => {
      console.log(w);
    });
  }
  console.log('\n');
  printDiff(diff);
  console.log('\n</details>');
  process.exit(1);
} else {
  let delta = diff.currentSize - diff.newSize;
  if (delta === 0) {
    console.log(`\n<details>\n  <summary>${diff.name} has not changed in size</summary>`);
  } else if (delta > 0) {
    console.log(
      `\n<details>\n  <summary>${diff.name} shrank by ${formatBytes(delta)} (${formatBytes(
        diff.currentSizeCompressed - diff.newSizeCompressed
      )} compressed)</summary>`
    );
  } else {
    let compressedDelta = diff.newSizeCompressed - diff.currentSizeCompressed;
    if (-1 * delta < library_failure_threshold) {
      console.log(
        `\n<details>\n  <summary>${diff.name} increased by ${formatBytes(-1 * delta)} (${formatBytes(
          compressedDelta
        )} compressed) which is within the allowed tolerance of ${library_failure_threshold} bytes uncompressed</summary>`
      );
    } else {
      console.log(
        `\n<details>\n  <summary>${diff.name} increased by ${formatBytes(
          -1 * delta
        )} uncompressed but decreased by ${formatBytes(-1 * compressedDelta)} compressed</summary>`
      );
    }
  }
  if (warnings.length) {
    console.log('\nWarnings\n-----------------------');
    warnings.forEach(w => {
      console.log(w);
    });
  } else {
    console.log('\nIf any packages had changed sizes they would be listed here.');
  }
  console.log('\n');
  printDiff(diff);
  console.log('\n</details>');
  process.exit(0);
}
