import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const exts = new Set(['.tsx', '.ts']);
const skip = [/\/types\//, /\/hooks\//, /\/locales\//, /\/lib\/i18n\.ts$/];

const issues = [];

function walk(dir) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (exts.has(path.extname(p)) && !skip.some(r => r.test(p))) checkFile(p);
  }
}

function checkFile(file) {
  const s = fs.readFileSync(file, 'utf8');
  const lines = s.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('tr(') || line.includes('t(')) return;
    if (line.includes('className=') || line.includes('console.') || line.includes('http')) return;

    const jsxText = line.match(/>\s*([A-Za-z][A-Za-z0-9 .&'/-]{2,})\s*</);
    const quoted = line.match(/"([A-Za-z][A-Za-z0-9 .&'/-]{2,})"|'([A-Za-z][A-Za-z0-9 .&'/-]{2,})'/);
    const text = jsxText?.[1] || quoted?.[1] || quoted?.[2];
    if (!text) return;

    const allow = ['react', 'tsx', 'json', 'module', 'en', 'zh', 'system', 'all'];
    if (allow.includes(text.toLowerCase())) return;

    issues.push(`${path.relative(process.cwd(), file)}:${i + 1} -> ${text}`);
  });
}

walk(ROOT);

if (issues.length) {
  console.log('Potential hardcoded UI strings:');
  console.log(issues.join('\n'));
  process.exit(1);
}

console.log('i18n scan passed.');
