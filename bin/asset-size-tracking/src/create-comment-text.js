const fs = require('fs');
const path = require('path');
const GITHUB_SHA = process.argv[2];

const diffPath = path.resolve(__dirname, '../../../tmp/asset-sizes/diff.txt');
const analysisPath = path.resolve(__dirname, '../../../tmp/asset-sizes/commit-analysis.txt');
const diffText = fs.readFileSync(diffPath);
const analysisText = fs.readFileSync(analysisPath);

const commentText = `Asset Size Report for ${GITHUB_SHA}\n${diffText}\n<details>\n  <summary>Full Asset Analysis</summary>\n\n\`\`\`${analysisText}\n\`\`\`\n</details>`;
const commentJSON = {
  body: commentText,
};

console.log(JSON.stringify(commentJSON, null, 2));
