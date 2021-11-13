const fs = require('fs');
const path = require('path');

const GITHUB_SHA = process.argv[2];

const ModernDiffPath = path.resolve(__dirname, '../../../tmp/asset-sizes/diff.txt');
const ModernAnalysisPath = path.resolve(__dirname, '../../../tmp/asset-sizes/experiment-analysis.txt');
const ModernDiffPathNoRollup = path.resolve(__dirname, '../../../tmp/asset-sizes/diff-no-rollup.txt');
const ModernAnalysisPathNoRollup = path.resolve(
  __dirname,
  '../../../tmp/asset-sizes/experiment-analysis-no-rollup.txt'
);

const ModernDiffText = fs.readFileSync(ModernDiffPath);
const ModernAnalysisText = fs.readFileSync(ModernAnalysisPath);
const ModernDiffTextNoRollup = fs.readFileSync(ModernDiffPathNoRollup);
const ModernAnalysisTextNoRollup = fs.readFileSync(ModernAnalysisPathNoRollup);

const commentText = `Asset Size Report for ${GITHUB_SHA}\n\n**Modern Builds**\n${ModernDiffText}\n<details>\n  <summary>Full Asset Analysis (Modern)</summary>\n\n\`\`\`${ModernAnalysisText}\n\`\`\`\n</details>
\n**Modern Builds (No Rollup)**\n${ModernDiffTextNoRollup}\n<details>\n  <summary>Full Asset Analysis (Modern)</summary>\n\n\`\`\`${ModernAnalysisTextNoRollup}\n\`\`\`\n</details>`;
const commentJSON = {
  body: commentText,
};

console.log(JSON.stringify(commentJSON, null, 2));
