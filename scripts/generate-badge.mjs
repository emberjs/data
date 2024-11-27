import { makeBadge } from 'badge-maker';
import fs from 'fs';
import path from 'path';

/*
{
  label: 'build',  // (Optional) Badge label
  message: 'passed',  // (Required) Badge message
  labelColor: '#555',  // (Optional) Label color
  color: '#4c1',  // (Optional) Message color
  logoBase64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iI2IxY2U1NiIvPjxwYXRoIGQ9Ik04IDBoMjR2NjRIOGMtNC40MzIgMC04LTMuNTY4LTgtOFY4YzAtNC40MzIgMy41NjgtOCA4LTh6IiBmaWxsPSIjNWQ1ZDVkIi8+PC9zdmc+' // (Optional) Any custom logo can be passed in a URL parameter by base64 encoding
  links: ['https://example.com', 'https://example.com'], // (Optional) Links array of maximum two links

  // (Optional) One of: 'plastic', 'flat', 'flat-square', 'for-the-badge' or 'social'
  // Each offers a different visual design.
  style: 'flat',

  // (Optional) A string with only letters, numbers, -, and _. This can be used
  // to ensure every element id within the SVG is unique and prevent CSS
  // cross-contamination when the SVG badge is rendered inline in HTML pages.
  idSuffix: 'dd'
}
*/
const args = process.argv.slice(2);
const argNames = {
  label: 'l',
  message: 'm',
  labelColor: 'lc',
  color: 'c',
  logoPath: 'p',
  links: 'ls',
  style: 's',
  idSuffix: 'id',
  out: 'o',
};
const argsMap = {
  l: 'label',
  m: 'message',
  lc: 'labelColor',
  c: 'color',
  p: 'logoPath',
  ls: 'links',
  s: 'style',
  id: 'idSuffix',
  o: 'out',
};

const format = {
  color: 'grey',
  style: 'flat',
};
let outPath = '';

for (let i = 0; i < args.length; i += 2) {
  if (!args[i].startsWith('-')) {
    throw new Error(`Invalid argument: ${args[i]}`);
  }
  const arg = args[i].slice(1);
  const value = args[i + 1];
  const name = arg in argNames ? arg : arg in argsMap ? argsMap[arg] : null;

  if (!name) {
    throw new Error(`Invalid argument: ${arg}`);
  }

  if (name !== 'logoPath' && name !== 'out') {
    format[name] = value;
    continue;
  }

  if (name === 'out') {
    outPath = path.join(process.cwd(), value);
    continue;
  }

  const base64 = fs.readFileSync(path.join(process.cwd(), value), 'utf8');
  format.logoBase64 = base64; // `data:image/svg+xml;base64,${base64}`;
}

const svg = makeBadge(format);
if (outPath) {
  fs.writeFileSync(outPath, svg);
} else {
  console.log(svg);
}
