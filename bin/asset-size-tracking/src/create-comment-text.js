const fs = require('fs');
const path = require('path');

const GITHUB_SHA = process.argv[2];

const IE11DiffPath = path.resolve(__dirname, '../../../tmp/asset-sizes/diff-ie11.txt');
const IE11AnalysisPath = path.resolve(__dirname, '../../../tmp/asset-sizes/experiment-analysis-ie11.txt');
const ModernDiffPath = path.resolve(__dirname, '../../../tmp/asset-sizes/diff.txt');
const ModernAnalysisPath = path.resolve(__dirname, '../../../tmp/asset-sizes/experiment-analysis.txt');
const ModernDiffPathNoRollup = path.resolve(__dirname, '../../../tmp/asset-sizes/diff-no-rollup.txt');
const ModernAnalysisPathNoRollup = path.resolve(
  __dirname,
  '../../../tmp/asset-sizes/experiment-analysis-no-rollup.txt'
);

const IE11DiffText = fs.readFileSync(IE11DiffPath);
const IE11AnalysisText = fs.readFileSync(IE11AnalysisPath);
const ModernDiffText = fs.readFileSync(ModernDiffPath);
const ModernAnalysisText = fs.readFileSync(ModernAnalysisPath);
const ModernDiffTextNoRollup = fs.readFileSync(ModernDiffPathNoRollup);
const ModernAnalysisTextNoRollup = fs.readFileSync(ModernAnalysisPathNoRollup);

const commentText = `Asset Size Report for ${GITHUB_SHA}\n\n**IE11 Builds**\n${IE11DiffText}\n<details>\n  <summary>Full Asset Analysis (IE11)</summary>\n\n\`\`\`${IE11AnalysisText}\n\`\`\`\n</details>
\n**Modern Builds**\n${ModernDiffText}\n<details>\n  <summary>Full Asset Analysis (Modern)</summary>\n\n\`\`\`${ModernAnalysisText}\n\`\`\`\n</details>
\n**Modern Builds (No Rollup)**\n${ModernDiffTextNoRollup}\n<details>\n  <summary>Full Asset Analysis (Modern)</summary>\n\n\`\`\`${ModernAnalysisTextNoRollup}\n\`\`\`\n</details>`;
const commentJSON = {
  body: commentText,
};

console.log(JSON.stringify(commentJSON, null, 2));
