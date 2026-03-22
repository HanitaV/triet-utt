const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const tthcmDir = path.join(rootDir, 'subjects', 'utt', 'ttHCM');
const examDir = path.join(tthcmDir, 'exam');
const reportPath = path.join(tthcmDir, 'format_issues_report.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(arr) {
  return [...new Set(arr)];
}

function detectIssues(question, chapter) {
  const issues = [];
  const options = Array.isArray(question.options) ? question.options : [];

  const optionById = new Map(options.map(opt => [opt.id, String(opt.content || '').trim()]));
  const optionValues = ['A', 'B', 'C', 'D'].map(id => ({ id, text: optionById.get(id) || '' }));

  const emptyOptions = optionValues.filter(opt => !opt.text);
  if (emptyOptions.length > 0) {
    issues.push({
      severity: 'high',
      code: 'EMPTY_OPTION',
      detail: `Thiếu nội dung đáp án: ${emptyOptions.map(opt => opt.id).join(', ')}`
    });
  }

  const normalizedOptions = optionValues
    .filter(opt => opt.text)
    .map(opt => ({ id: opt.id, normalized: normalizeText(opt.text) }));

  const duplicates = [];
  for (let i = 0; i < normalizedOptions.length; i++) {
    for (let j = i + 1; j < normalizedOptions.length; j++) {
      if (normalizedOptions[i].normalized === normalizedOptions[j].normalized) {
        duplicates.push(`${normalizedOptions[i].id}=${normalizedOptions[j].id}`);
      }
    }
  }
  if (duplicates.length > 0) {
    issues.push({
      severity: 'high',
      code: 'DUPLICATE_OPTION',
      detail: `Đáp án trùng nội dung: ${uniq(duplicates).join(', ')}`
    });
  }

  const qText = String(question.question || '');
  const eText = String(question.explain || '');
  const merged = `${qText} ${eText} ${optionValues.map(o => o.text).join(' ')}`;

  if (/\(\.\.\.\)/i.test(merged)) {
    issues.push({
      severity: 'low',
      code: 'PLACEHOLDER_TEXT',
      detail: 'Co dau hieu placeholder (...).'
    });
  }

  if (/,,|\?\?|!!|\. ,|,\./.test(merged)) {
    issues.push({
      severity: 'medium',
      code: 'PUNCTUATION_ARTIFACT',
      detail: 'Co dau hieu loi dau cau (,, ?? !! ,.).'
    });
  }

  const repeatedPhraseMatch = normalizeText(merged).match(/\b([\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){2,})\s+\1\b/u);
  if (repeatedPhraseMatch) {
    issues.push({
      severity: 'medium',
      code: 'REPEATED_PHRASE',
      detail: `Lap cum tu lien tiep: "${repeatedPhraseMatch[1]}"`
    });
  }

  const answer = String(question.answer || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(answer)) {
    issues.push({
      severity: 'high',
      code: 'INVALID_ANSWER_KEY',
      detail: `Đáp án đúng không hợp lệ: "${question.answer}"`
    });
  } else if (!optionById.get(answer)) {
    issues.push({
      severity: 'high',
      code: 'ANSWER_OPTION_MISSING',
      detail: `Đáp án đúng ${answer} nhưng option ${answer} rỗng/thiếu`
    });
  }

  if (chapter === 5 && [25, 46, 57].includes(question.id) && !optionById.get('D')) {
    issues.push({
      severity: 'high',
      code: 'KNOWN_CH5_D_MISSING',
      detail: 'Câu đã biết bị thiếu đáp án D sau merge từ c4 5 6.md'
    });
  }

  return issues;
}

function severityRank(level) {
  if (level === 'high') return 0;
  if (level === 'medium') return 1;
  return 2;
}

function main() {
  const allFindings = [];

  for (let chapter = 1; chapter <= 6; chapter++) {
    const examPath = path.join(examDir, `chuong_${chapter}.json`);
    const exam = readJson(examPath);
    const questions = Array.isArray(exam.questions) ? exam.questions : [];

    for (const question of questions) {
      const issues = detectIssues(question, chapter);
      if (issues.length === 0) continue;

      allFindings.push({
        chapter,
        id: question.id,
        question: String(question.question || '').trim(),
        issues
      });
    }
  }

  allFindings.sort((a, b) => {
    const sa = Math.min(...a.issues.map(issue => severityRank(issue.severity)));
    const sb = Math.min(...b.issues.map(issue => severityRank(issue.severity)));
    if (sa !== sb) return sa - sb;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.id - b.id;
  });

  const lines = [];
  lines.push('# TT HCM - Danh sach cau nhieu / format kem');
  lines.push('');
  lines.push(`- Tong so cau bi gan co: ${allFindings.length}`);

  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const item of allFindings) {
    for (const issue of item.issues) {
      bySeverity[issue.severity] += 1;
    }
  }

  lines.push(`- So loi muc high: ${bySeverity.high}`);
  lines.push(`- So loi muc medium: ${bySeverity.medium}`);
  lines.push(`- So loi muc low: ${bySeverity.low}`);
  lines.push('');
  lines.push('## Chi tiet');
  lines.push('');

  for (const item of allFindings) {
    lines.push(`- CH${item.chapter} - C${item.id}`);
    lines.push(`  - Cau hoi: ${item.question}`);
    for (const issue of item.issues) {
      lines.push(`  - [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.detail}`);
    }
  }

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        reportPath,
        totalFlaggedQuestions: allFindings.length,
        issueCounts: bySeverity
      },
      null,
      2
    )
  );
}

main();
