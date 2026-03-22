const fs = require('fs');
const path = require('path');

const examDir = path.join(__dirname, '..', 'subjects', 'utt', 'ttHCM', 'exam');

function cleanExplain(text) {
  if (typeof text !== 'string' || !text) return text;

  return text
    .replace(/",\./g, '".')
    .replace(/,\./g, '.')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\.{2,}$/g, '.')
    .trim();
}

for (let i = 1; i <= 6; i++) {
  const filePath = path.join(examDir, `chuong_${i}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const q of data.questions || []) {
    q.explain = cleanExplain(q.explain);
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

console.log('cleanup done');