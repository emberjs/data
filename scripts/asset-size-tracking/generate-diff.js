'use strict';

const fs = require('fs');
const path = require('path');

const chalk = require('chalk');

const Library = require('./src/library');
const parseModules = require('./src/parse-modules');
const getBuiltDist = require('./src/get-built-dist');

let BASE_DATA_FILE = process.argv[2] || false;
let NEW_DATA_FILE = process.argv[3] || false;

let library_failure_threshold = 75;
const package_warn_threshold = 0;

if (!BASE_DATA_FILE) {
  BASE_DATA_FILE = './current-data.json';
}

const baseData = fs.readFileSync(path.resolve(__dirname, BASE_DATA_FILE), 'utf-8');
const current_library = Library.fromData(JSON.parse(baseData));

let new_library;
if (!NEW_DATA_FILE) {
  const builtAsset = getBuiltDist();
  new_library = parseModules(builtAsset);
} else {
  const newData = fs.readFileSync(path.resolve(__dirname, NEW_DATA_FILE), 'utf-8');
  new_library = Library.fromData(JSON.parse(newData));
}

function getDiff(oldLibrary, newLibrary) {
  const compressionDelta = newLibrary.compressedSize - oldLibrary.compressedSize;
  const libDelta = newLibrary.absoluteSize - oldLibrary.absoluteSize;

  /*
    The idea here is that because compression is not directly correlated
    to bytes and because compression on smaller subsets behaves differently
    than on the overall project, we take the overall compressed size change
    and assign it a share based on the relative byte change.

    note:
    Compression behaves in ways you may not expect. Removing some bytes may
    actually reduce compressibility and result in a larger compressed output.
   */
  function getRelativeDeltaForItem(item) {
    const itemDelta = item.newSize - item.currentSize; // our absolute change
    const itemDeltaRelativeSize = itemDelta / libDelta; // divided by the overall absolute change
    const relativeDelta = itemDeltaRelativeSize * compressionDelta; // times the overall compressed change

    return relativeDelta;
  }

  const diff = {
    name: oldLibrary.name,
    currentSize: oldLibrary.absoluteSize,
    newSize: newLibrary.absoluteSize,
    currentSizeCompressed: oldLibrary.compressedSize,
    newSizeCompressed: newLibrary.compressedSize,
    compressionDelta,
    packages: {},
  };
  oldLibrary.packages.forEach((pkg) => {
    diff.packages[pkg.name] = {
      name: pkg.name,
      currentSize: pkg.absoluteSize,
      newSize: 0,
      currentSizeCompressed: pkg.compressedSize,
      newSizeCompressed: 0,
      modules: {},
    };
    let modules = diff.packages[pkg.name].modules;
    pkg.modules.forEach((m) => {
      modules[m.name] = {
        name: m.name,
        currentSize: m.absoluteSize,
        newSize: 0,
        currentSizeCompressed: m.compressedSize,
        newSizeCompressed: 0,
      };
    });
  });
  newLibrary.packages.forEach((pkg) => {
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
    pkg.modules.forEach((m) => {
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
  diff.packages.forEach((pkg) => {
    pkg.compressionDelta = getRelativeDeltaForItem(pkg);
    pkg.modules = Object.values(pkg.modules);
    pkg.modules.forEach((m) => {
      m.compressionDelta = getRelativeDeltaForItem(m);
    });
  });

  return diff;
}

const diff = getDiff(current_library, new_library);

function analyzeDiff(diff) {
  let failures = [];
  let warnings = [];

  let delta = diff.newSize - diff.currentSize;
  let compressedDelta = diff.newSizeCompressed - diff.currentSizeCompressed;

  if (delta > 0) {
    if (delta > library_failure_threshold && compressedDelta > 0) {
      failures.push(
        `🛑 The size of the library ${diff.name} has increased by ${formatBytes(delta)} (${formatBytes(
          compressedDelta
        )} compressed) which exceeds the failure threshold of ${library_failure_threshold} bytes.`
      );
    }
  }

  diff.packages.forEach((pkg) => {
    if (pkg.currentSize < pkg.newSize) {
      let delta = pkg.newSize - pkg.currentSize;
      if (delta > package_warn_threshold) {
        warnings.push(`⚠️ The uncompressed size of the package ${pkg.name} has increased by ${formatBytes(delta)}.`);
      }
    }
  });

  return { failures, warnings };
}

function printDiff(diff) {
  console.log('\n```\n');
  printItem(diff);
  diff.packages.forEach((pkg) => {
    printItem(pkg, 2);
    pkg.modules.forEach((m) => {
      printItem(m, 4);
    });
  });
  console.log('\n```\n');
}

function printItem(item, indent = 0) {
  if (item.currentSize !== item.newSize) {
    const indentColor = indent >= 4 ? 'grey' : indent >= 2 ? 'yellow' : indent >= 0 ? 'magenta' : 'green';
    console.log(
      leftPad(chalk[indentColor](item.name) + ' ' + formatSize(item, false) + ' ' + formatSize(item, true), indent * 2)
    );
  }
}

function formatSize(item, isCompressed = false) {
  let size = formatBytes(isCompressed ? item.newSizeCompressed : item.newSize, false);
  let delta = formatDelta(item, isCompressed);

  return isCompressed ? chalk.grey(`(${chalk.white(size)} ${delta} compressed)`) : `${chalk.white(size)} ${delta}`;
}

function formatDelta(item, isCompressed = false) {
  let delta = isCompressed ? item.compressionDelta : item.newSize - item.currentSize;

  if (delta === 0) {
    return chalk.black('±0 B');
  }

  if (delta < 0) {
    return chalk.green(`${formatBytes(delta)}`);
  } else {
    return chalk.red(`${formatBytes(delta)}`);
  }
}

function humanizeNumber(n, isDelta = true) {
  let s = n.toFixed(2);
  if (s.charAt(s.length - 1) === '0') {
    s = n.toFixed(1);

    if (s.charAt(s.length - 2) === '0') {
      s = n.toFixed(0);
    }
  }
  if (isDelta && n > 0) {
    s = '+' + s;
  }
  return s;
}

function formatBytes(b, isDelta) {
  let str;
  if (b > 1024 || b < -1024) {
    str = humanizeNumber(b / 1024, isDelta) + ' KB';
  } else {
    str = humanizeNumber(b, isDelta) + ' B';
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
    failures.forEach((f) => {
      console.log(f);
    });
  }
  if (warnings.length) {
    console.log('\nWarnings\n-----------------------');
    warnings.forEach((w) => {
      console.log(w);
    });
  }
  console.log('\n**Changeset**\n');
  printDiff(diff);
  console.log('\n</details>');
  process.exit(1);
} else {
  let delta = -1 * (diff.currentSize - diff.newSize);
  let compressedDelta = -1 * (diff.currentSizeCompressed - diff.newSizeCompressed);

  // no changes to report
  if (delta === 0) {
    console.log(`\n<details>\n  <summary>☑️ ${diff.name} has not changed in size</summary>`);

    // we shrank in absolute bytes
  } else if (delta < 0) {
    if (compressedDelta <= 0) {
      console.log(
        `\n<details>\n  <summary>✅ ${diff.name} shrank by ${formatBytes(delta)} (${formatBytes(
          compressedDelta
        )} compressed)</summary>`
      );
    } else {
      console.log(
        `\n<details>\n  <summary>☑️ ${diff.name} shrank by ${formatBytes(
          delta
        )} but the compressed size increased slighty (${formatBytes(compressedDelta)} compressed)</summary>`
      );
    }

    // we increased in absolute bytes
  } else {
    // the increase wasn't much to talk about
    if (delta < library_failure_threshold) {
      console.log(
        `\n<details>\n  <summary>${diff.name} increased by ${formatBytes(-1 * delta)} (${formatBytes(
          compressedDelta
        )} compressed) which is within the allowed tolerance of ${library_failure_threshold} bytes uncompressed</summary>`
      );
      //the increase was enough to talk about but compressed somehow went down
    } else if (compressedDelta < 0) {
      console.log(
        `\n<details>\n  <summary>${diff.name} increased by ${formatBytes(
          delta
        )} uncompressed but decreased by ${formatBytes(compressedDelta)} compressed</summary>`
      );
      // we increased
    } else {
      console.log(
        `\n<details>\n  <summary>${diff.name} increased by ${formatBytes(delta)} uncompressed (${formatBytes(
          compressedDelta
        )} compressed)</summary>`
      );
    }
  }
  if (warnings.length) {
    console.log('\nWarnings\n-----------------------');
    warnings.forEach((w) => {
      console.log(w);
    });
  } else {
    console.log('\nIf any packages had changed sizes they would be listed here.');
  }
  console.log('\n**Changeset**\n');
  printDiff(diff);
  console.log('\n</details>');
  process.exit(0);
}
