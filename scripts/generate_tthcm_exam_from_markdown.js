const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const tthcmDir = path.join(rootDir, 'subjects', 'utt', 'ttHCM');
const examDir = path.join(tthcmDir, 'exam');
const studyDataPath = path.join(tthcmDir, 'study_data.json');

const chapterFiles = {
  1: 'ltc1.md',
  2: 'ltc2.md',
  3: 'ltc3.md',
  4: 'ltc4.md',
  5: 'ltc5.md',
  6: 'ltc6.md'
};

const supplementalFiles = ['half-left.md', 'left.md'];

const sourceQuestionFiles = ['c1 .md', 'c2.md', 'c3.md', 'c4 5 6.md'];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeSpace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripMarkdown(text) {
  return normalizeSpace(
    text
      .replace(/^#+\s*/g, '')
      .replace(/^[-+]\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
  );
}

function makeKey(chapter, id) {
  return `${chapter}-${id}`;
}

function addAnswer(store, item) {
  const key = makeKey(item.chapter, item.id);
  const existing = store.get(key);

  if (!existing || !existing.answerLetter) {
    store.set(key, item);
    return;
  }

  // Prefer explicit question text over generated fallback.
  if (existing.sourceType !== 'explicit' && item.sourceType === 'explicit') {
    store.set(key, item);
    return;
  }

  // Prefer longer answer text for better option quality.
  if ((item.answerText || '').length > (existing.answerText || '').length) {
    store.set(key, { ...existing, ...item });
  }
}

function parseExplicitFromLtc(content, chapter, store) {
  const lines = content.split(/\r?\n/);

  let pending = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = stripMarkdown(raw);

    // Pattern: Câu 14: ...?
    const qMatch = line.match(/^Câu\s*(\d+)\s*:\s*(.+)$/i);
    if (qMatch && qMatch[2].length > 0) {
      pending = {
        chapter,
        id: parseInt(qMatch[1], 10),
        question: qMatch[2],
        answerLetter: null,
        answerText: '',
        explain: '',
        sourceType: 'explicit'
      };
      continue;
    }

    // Pattern: Đáp án đúng: B. ...
    if (pending) {
      const aMatch = line.match(/^Đáp án đúng\s*:\s*([A-D])\.\s*(.+)$/i);
      if (aMatch) {
        pending.answerLetter = aMatch[1].toUpperCase();
        pending.answerText = aMatch[2];
        continue;
      }

      const eMatch = line.match(/^Giải thích\s*:\s*(.+)$/i);
      if (eMatch) {
        pending.explain = eMatch[1];
        addAnswer(store, pending);
        pending = null;
      }

      const inlineMatch = line.match(/^Câu\s*(\d+)\s*:\s*([A-D])\.\s*(.+)$/i);
      if (inlineMatch) {
        addAnswer(store, {
          chapter,
          id: parseInt(inlineMatch[1], 10),
          answerLetter: inlineMatch[2].toUpperCase(),
          answerText: inlineMatch[3],
          explain: inlineMatch[3],
          sourceType: 'inline'
        });
      }
    }
  }

  // Fallback if explanation line is missing.
  if (pending && pending.answerLetter && pending.answerText) {
    addAnswer(store, pending);
  }
}

function parseGroupedLine(line, chapter, store) {
  // Pattern example:
  // Câu 25 (C), Câu 33 (D): Độc lập, tự do là quyền thiêng liêng...
  const plain = stripMarkdown(line);
  if (!plain.includes('Câu')) return;

  const pairRegex = /Câu\s*(\d+)\s*\(([A-D])\)/gi;
  const pairs = [];
  let m;
  while ((m = pairRegex.exec(plain)) !== null) {
    pairs.push({ id: parseInt(m[1], 10), letter: m[2].toUpperCase() });
  }

  if (pairs.length === 0) return;

  const colonIdx = plain.indexOf(':');
  if (colonIdx < 0) return;

  const statement = normalizeSpace(plain.slice(colonIdx + 1));
  if (!statement) return;

  for (const p of pairs) {
    addAnswer(store, {
      chapter,
      id: p.id,
      answerLetter: p.letter,
      answerText: statement,
      explain: statement,
      sourceType: 'grouped'
    });
  }
}

function parseCompactSupplemental(content, store) {
  const lines = content.split(/\r?\n/);
  let currentChapter = null;

  for (const raw of lines) {
    const line = stripMarkdown(raw);
    const chapterMatch = line.match(/^Chương\s*(\d+)$/i);
    if (chapterMatch) {
      currentChapter = parseInt(chapterMatch[1], 10);
      continue;
    }

    if (!currentChapter) continue;

    // Pattern: Câu 60: Đáp án A. Nội dung...
    const p1 = line.match(/^Câu\s*(\d+)\s*:\s*Đáp án\s*([A-D])\.\s*(.+)$/i);
    if (p1) {
      addAnswer(store, {
        chapter: currentChapter,
        id: parseInt(p1[1], 10),
        answerLetter: p1[2].toUpperCase(),
        answerText: p1[3],
        explain: p1[3],
        sourceType: 'supplemental'
      });
      continue;
    }

    // Pattern: Câu 4: C. Nội dung...
    const p2 = line.match(/^Câu\s*(\d+)\s*:\s*([A-D])\.\s*(.+)$/i);
    if (p2) {
      addAnswer(store, {
        chapter: currentChapter,
        id: parseInt(p2[1], 10),
        answerLetter: p2[2].toUpperCase(),
        answerText: p2[3],
        explain: p2[3],
        sourceType: 'supplemental'
      });
    }
  }
}

function parseSourceQuestions() {
  const sourceMap = new Map();

  for (const fileName of sourceQuestionFiles) {
    const fullPath = path.join(tthcmDir, fileName);
    const content = readText(fullPath);
    const lines = content.split(/\r?\n/);

    let currentChapter = null;
    let currentQuestion = null;

    const commitCurrentQuestion = () => {
      if (!currentQuestion) return;

      if (currentQuestion.chapter >= 1 && currentQuestion.chapter <= 6) {
        const hasAllOptions = ['A', 'B', 'C', 'D'].every(letter => Boolean(currentQuestion.options[letter]));
        if (hasAllOptions) {
          const key = makeKey(currentQuestion.chapter, currentQuestion.id);
          if (!sourceMap.has(key)) {
            sourceMap.set(key, currentQuestion);
          }
        }
      }

      currentQuestion = null;
    };

    for (const raw of lines) {
      const plain = stripMarkdown(raw);

      const chapterMatch = plain.match(/(?:CHƯƠNG|CHUONG)\s*(\d+)/i);
      if (chapterMatch) {
        currentChapter = parseInt(chapterMatch[1], 10);
        continue;
      }

      const qMatch = plain.match(/^Câu\s*(\d+)\s*[:.]\s*(.+)$/i);
      if (qMatch) {
        commitCurrentQuestion();
        currentQuestion = {
          chapter: currentChapter,
          id: parseInt(qMatch[1], 10),
          question: normalizeSpace(qMatch[2]),
          options: {
            A: '',
            B: '',
            C: '',
            D: ''
          }
        };
        continue;
      }

      if (!currentQuestion) continue;

      const oMatch = plain.match(/^([A-D])\.\s*(.+)$/i);
      if (oMatch) {
        currentQuestion.options[oMatch[1].toUpperCase()] = normalizeSpace(oMatch[2]);
      }
    }

    commitCurrentQuestion();
  }

  return sourceMap;
}

function buildExamByChapter(sourceMap, answerMap) {
  const byChapter = new Map();
  for (let ch = 1; ch <= 6; ch++) byChapter.set(ch, []);

  const letters = ['A', 'B', 'C', 'D'];

  for (const [key, sourceQ] of sourceMap.entries()) {
    const answer = answerMap.get(key);
    if (!answer || !letters.includes(answer.answerLetter)) continue;

    const answerLetter = answer.answerLetter;
    if (!sourceQ.options[answerLetter]) continue;

    const options = letters.map(letter => ({
      id: letter,
      content: sourceQ.options[letter]
    }));

    const explain = answer.explain || answer.answerText || sourceQ.options[answerLetter];
    byChapter.get(sourceQ.chapter).push({
      id: sourceQ.id,
      question: sourceQ.question,
      options,
      answer: answerLetter,
      explain
    });
  }

  for (let ch = 1; ch <= 6; ch++) {
    byChapter.set(
      ch,
      byChapter
        .get(ch)
        .sort((a, b) => a.id - b.id)
    );
  }

  return byChapter;
}

function writeExamFiles(byChapter) {
  if (!fs.existsSync(examDir)) {
    fs.mkdirSync(examDir, { recursive: true });
  }

  for (let ch = 1; ch <= 6; ch++) {
    const mcq = byChapter.get(ch) || [];

    const output = {
      title: `CHƯƠNG ${ch}`,
      total_questions: mcq.length,
      questions: mcq
    };

    const outputPath = path.join(examDir, `chuong_${ch}.json`);
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  }
}

function updateStudyData(byChapter) {
  const studyData = JSON.parse(readText(studyDataPath));

  for (const topic of studyData) {
    const chapter = Array.isArray(topic.chapters) ? topic.chapters[0] : null;
    if (!chapter) continue;

    const ids = (byChapter.get(chapter) || []).map(q => q.id).sort((a, b) => a - b);
    topic.questionIds = {
      [String(chapter)]: ids
    };
  }

  fs.writeFileSync(studyDataPath, `${JSON.stringify(studyData, null, 4)}\n`, 'utf8');
}

function main() {
  const answerStore = new Map();

  // Parse answers from primary chapter files.
  for (let chapter = 1; chapter <= 6; chapter++) {
    const mdPath = path.join(tthcmDir, chapterFiles[chapter]);
    const content = readText(mdPath);

    parseExplicitFromLtc(content, chapter, answerStore);

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      parseGroupedLine(line, chapter, answerStore);

      const inline = stripMarkdown(line).match(/^Câu\s*(\d+)\s*:\s*([A-D])\.\s*(.+)$/i);
      if (inline) {
        addAnswer(answerStore, {
          chapter,
          id: parseInt(inline[1], 10),
          answerLetter: inline[2].toUpperCase(),
          answerText: inline[3],
          explain: inline[3],
          sourceType: 'inline'
        });
      }
    }
  }

  // Parse supplemental markdown files with chapter headers.
  for (const fileName of supplementalFiles) {
    const mdPath = path.join(tthcmDir, fileName);
    const content = readText(mdPath);
    parseCompactSupplemental(content, answerStore);
  }

  // Parse question stems/options from original c*.md sources.
  const sourceQuestionMap = parseSourceQuestions();

  // Merge by chapter + id, keeping only entries with both source options and answer key.
  const byChapterMap = buildExamByChapter(sourceQuestionMap, answerStore);

  writeExamFiles(byChapterMap);
  updateStudyData(byChapterMap);

  const stats = {};
  let total = 0;
  for (let ch = 1; ch <= 6; ch++) {
    const count = (byChapterMap.get(ch) || []).length;
    stats[`chuong_${ch}`] = count;
    total += count;
  }

  console.log('Generated TT HCM exam bank from c*.md + answer keys from ltc/supplement files.');
  console.log(JSON.stringify({ total_questions: total, ...stats }, null, 2));
}

main();
