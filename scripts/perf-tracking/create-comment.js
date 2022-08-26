const fs = require('fs');
const path = require('path');

const GITHUB_SHA = process.argv[2];

const analysisPath = path.resolve(__dirname, `../../tracerbench-results/analysis-output.json`);
let analysisJSON = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
let commentText = `${process.env.COMMENT_MARKER || 'Performance Report for'} ${GITHUB_SHA}`;

Object.keys(analysisJSON).forEach((name) => {
  let analysisText = analysisJSON[name];
  let lines = analysisText.substr(analysisText.indexOf('Benchmark Results Summary')).split('\n');

  lines = lines.filter((l) => l.indexOf('Phase') !== -1 || l.indexOf('phase') !== -1);
  let firstLine = lines[0];
  lines = lines.map((l) => {
    if (l.indexOf('improvement') !== -1) {
      return `> ✅  ${l.split(' phase ').join('\n>     phase ')}`;
    } else if (l.indexOf('regression') !== -1) {
      return `> ⚠️  ${l.split(' phase ').join('\n>     phase ')}`;
    } else {
      return `> ☑️  ${l.split(' phase ').join('\n>     phase ')}`;
    }
  });
  analysisText = lines.join('\n');

  let overview;
  if (firstLine.indexOf('improvement') !== -1) {
    overview = `✅ Performance improved`;
  } else if (firstLine.indexOf('regression') !== -1) {
    overview = `⚠️  Performance regressed`;
  } else {
    overview = `☑️  Performance is stable`;
  }

  commentText += `\n<details>\n  <summary>Scenario - ${name}: ${overview}</summary>\n\n${analysisText}\n\n</details>`;
});

const commentJSON = {
  body: commentText,
};

console.log(JSON.stringify(commentJSON, null, 2));
