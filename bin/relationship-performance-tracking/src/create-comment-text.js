const fs = require('fs');
const path = require('path');

const GITHUB_SHA = process.argv[2];

const analysisPath = path.resolve(__dirname, '../../../tmp/relationship-performance/commit-analysis.txt');
const analysisText = fs.readFileSync(analysisPath);

const commentText = `Performance Report for ${GITHUB_SHA}\n<details>\n  <summary>Relationship Analysis</summary>\n\n\`\`\`${analysisText}\n\`\`\`\n</details>`;
const commentJSON = {
  body: commentText,
};

console.log(JSON.stringify(commentJSON, null, 2));
