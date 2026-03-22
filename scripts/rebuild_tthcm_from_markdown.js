const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const tthcmDir = path.join(rootDir, 'subjects', 'utt', 'ttHCM');
const examDir = path.join(tthcmDir, 'exam');
const studyDataPath = path.join(tthcmDir, 'study_data.json');

const questionFiles = {
  1: 'c1 .md',
  2: 'c2.md',
  3: 'c3.md',
  4: 'c4.md',
  5: 'c5.md',
  6: 'c6.md'
};

const answerFiles = {
  1: 'c1_answer.md',
  2: 'c2_answer.md',
  3: 'c3_answer.md',
  4: 'c4_answer.md',
  5: 'c5_answer.md',
  6: 'c6_answer.md'
};

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeSpace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function sanitizeExplain(text) {
  if (!text) return '';

  let cleaned = normalizeSpace(text);

  // Remove wrapping markdown artifacts if any remain.
  cleaned = cleaned.replace(/^\*?\s*Cơ sở\s*:\s*/i, '');

  // Remove duplicated wrapping quotes around the full explanation.
  cleaned = cleaned.replace(/^(["“”'`])+\s*/, '');
  cleaned = cleaned.replace(/\s*(["“”'`])+$/, '');

  // Normalize common punctuation artifacts from source files.
  cleaned = cleaned.replace(/\s+([,.;!?])/g, '$1');
  cleaned = cleaned.replace(/,\./g, '.');
  cleaned = cleaned.replace(/,{2,}/g, ',');
  cleaned = cleaned.replace(/\.{4,}/g, '...');
  cleaned = cleaned.replace(/",\.+$/g, '.');
  cleaned = cleaned.replace(/\",\.+$/g, '.');
  cleaned = cleaned.replace(/,\.+$/g, '.');
  cleaned = cleaned.replace(/,+$/g, '.');
  cleaned = cleaned.replace(/\.{2,}$/g, '.');

  return normalizeSpace(cleaned);
}

function stripMarkdown(text) {
  return normalizeSpace(
    text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
  );
}

function parseQuestionFile(filePath) {
  const lines = readUtf8(filePath).split(/\r?\n/);
  const questions = [];

  let current = null;
  let currentOption = null;

  function commitCurrent() {
    if (!current) return;

    const orderedOptions = ['A', 'B', 'C', 'D']
      .filter(letter => current.options[letter])
      .map(letter => ({ id: letter, content: normalizeSpace(current.options[letter]) }));

    if (orderedOptions.length === 4 && current.question) {
      questions.push({
        id: current.id,
        question: normalizeSpace(current.question),
        options: orderedOptions
      });
    }

    current = null;
    currentOption = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const plain = stripMarkdown(line);

    const questionMatch = plain.match(/^Câu\s*(\d+)\s*[:.]\s*(.+)$/i);
    if (questionMatch) {
      commitCurrent();
      current = {
        id: parseInt(questionMatch[1], 10),
        question: normalizeSpace(questionMatch[2]),
        options: { A: '', B: '', C: '', D: '' }
      };
      currentOption = null;
      continue;
    }

    if (!current) continue;

    const optionMatch = plain.match(/^([A-D])\.\s*(.+)$/i);
    if (optionMatch) {
      const letter = optionMatch[1].toUpperCase();
      current.options[letter] = normalizeSpace(optionMatch[2]);
      currentOption = letter;
      continue;
    }

    // Continuation lines can belong to the question or the latest option.
    if (currentOption) {
      current.options[currentOption] = normalizeSpace(`${current.options[currentOption]} ${plain}`);
    } else {
      current.question = normalizeSpace(`${current.question} ${plain}`);
    }
  }

  commitCurrent();

  const deduped = [];
  const seen = new Set();
  for (const q of questions) {
    const key = `${q.id}::${normalizeSpace(q.question).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(q);
  }

  return deduped.sort((a, b) => a.id - b.id);
}

function parseAnswerFile(filePath) {
  const lines = readUtf8(filePath).split(/\r?\n/);
  const answerMap = new Map();

  let currentId = null;
  let currentAnswer = null;
  let currentExplainParts = [];

  function commitCurrent() {
    if (!currentId || !currentAnswer) return;
    const explainRaw = normalizeSpace(currentExplainParts.join(' ')) || currentAnswer.text;
    const explain = sanitizeExplain(explainRaw);
    answerMap.set(currentId, {
      answer: currentAnswer.letter,
      answerText: currentAnswer.text,
      explain
    });
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const plain = stripMarkdown(line);

    const qMatch = plain.match(/^Câu\s*(\d+)\s*[:.]\s*/i);
    if (qMatch) {
      commitCurrent();
      currentId = parseInt(qMatch[1], 10);
      currentAnswer = null;
      currentExplainParts = [];
      continue;
    }

    if (!currentId) continue;

    const answerMatch = plain.match(/^Đáp án đúng\s*:\s*([A-D])\.\s*(.+)$/i);
    if (answerMatch) {
      currentAnswer = {
        letter: answerMatch[1].toUpperCase(),
        text: normalizeSpace(answerMatch[2])
      };
      continue;
    }

    const basisMatch = plain.match(/^Cơ sở\s*:\s*(.+)$/i);
    if (basisMatch) {
      currentExplainParts.push(normalizeSpace(basisMatch[1]));
      continue;
    }

    if (currentExplainParts.length > 0) {
      currentExplainParts.push(plain);
    }
  }

  commitCurrent();
  return answerMap;
}

function shouldIgnoreAnswerFile(chapterNumber) {
  if (chapterNumber !== 3) return false;

  const c2Path = path.join(tthcmDir, answerFiles[2]);
  const c3Path = path.join(tthcmDir, answerFiles[3]);

  if (!fs.existsSync(c2Path) || !fs.existsSync(c3Path)) return false;

  const c2Text = normalizeSpace(readUtf8(c2Path));
  const c3Text = normalizeSpace(readUtf8(c3Path));

  // If chapter 3 answer file is effectively a duplicate of chapter 2, ignore it.
  return c2Text.length > 0 && c2Text === c3Text;
}

function rebuildChapter(chapterNumber) {
  const qPath = path.join(tthcmDir, questionFiles[chapterNumber]);
  const aPath = path.join(tthcmDir, answerFiles[chapterNumber]);

  const questions = parseQuestionFile(qPath);
  const ignoreAnswers = shouldIgnoreAnswerFile(chapterNumber);
  const answers = ignoreAnswers ? new Map() : parseAnswerFile(aPath);

  const merged = [];
  const missingAnswers = [];

  for (const q of questions) {
    const answer = answers.get(q.id);
    if (!answer) {
      missingAnswers.push(q.id);
      merged.push({
        id: q.id,
        question: q.question,
        options: q.options,
        answer: '',
        explain: ''
      });
      continue;
    }

    const hasCorrectOption = q.options.some(opt => opt.id === answer.answer);
    if (!hasCorrectOption) {
      missingAnswers.push(q.id);
      merged.push({
        id: q.id,
        question: q.question,
        options: q.options,
        answer: '',
        explain: ''
      });
      continue;
    }

    merged.push({
      id: q.id,
      question: q.question,
      options: q.options,
      answer: answer.answer,
      explain: answer.explain
    });
  }

  const output = {
    title: `CHƯƠNG ${chapterNumber}`,
    total_questions: merged.length,
    questions: merged.sort((a, b) => a.id - b.id)
  };

  return {
    output,
    questionIds: output.questions.map(q => q.id),
    missingAnswers,
    ignoredAnswerFile: ignoreAnswers
  };
}

function writeExamFiles(chapterResults) {
  if (!fs.existsSync(examDir)) {
    fs.mkdirSync(examDir, { recursive: true });
  }

  for (let chapter = 1; chapter <= 6; chapter++) {
    const outPath = path.join(examDir, `chuong_${chapter}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(chapterResults[chapter].output, null, 2)}\n`, 'utf8');
  }
}

function updateStudyData(chapterResults) {
  const studyData = JSON.parse(readUtf8(studyDataPath));

  for (const topic of studyData) {
    const chapter = Array.isArray(topic.chapters) ? topic.chapters[0] : null;
    if (!chapter || !chapterResults[chapter]) continue;

    topic.questionIds = {
      [String(chapter)]: chapterResults[chapter].questionIds
    };
  }

  fs.writeFileSync(studyDataPath, `${JSON.stringify(studyData, null, 4)}\n`, 'utf8');
}

function main() {
  const chapterResults = {};
  const stats = {};
  let total = 0;

  for (let chapter = 1; chapter <= 6; chapter++) {
    const result = rebuildChapter(chapter);
    chapterResults[chapter] = result;
    stats[`chuong_${chapter}`] = result.output.total_questions;
    total += result.output.total_questions;
  }

  writeExamFiles(chapterResults);
  updateStudyData(chapterResults);

  const missing = {};
  const ignoredAnswerFiles = [];
  for (let chapter = 1; chapter <= 6; chapter++) {
    if (chapterResults[chapter].missingAnswers.length > 0) {
      missing[`chuong_${chapter}`] = chapterResults[chapter].missingAnswers;
    }
    if (chapterResults[chapter].ignoredAnswerFile) {
      ignoredAnswerFiles.push(`chuong_${chapter}`);
    }
  }

  console.log('Rebuilt TT HCM question bank from c*.md + c*_answer.md');
  console.log(JSON.stringify({ total_questions: total, ...stats }, null, 2));
  if (Object.keys(missing).length > 0) {
    console.log('Questions skipped due to missing/invalid answers:');
    console.log(JSON.stringify(missing, null, 2));
  }
  if (ignoredAnswerFiles.length > 0) {
    console.log('Ignored corrupted duplicate answer files for:');
    console.log(JSON.stringify(ignoredAnswerFiles, null, 2));
  }
}

main();