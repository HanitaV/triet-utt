const fs = require('fs');
const path = require('path');

// Mock browser globals
const window = { QUIZ_DATA: {} };
const subjectsData = [
    {
        "id": "phap-luat-dai-cuong",
        "path": "subjects/ptit/phap-luat-dai-cuong",
        "examPath": "exam"
    }
];
const currentSubjectData = JSON.parse(fs.readFileSync('subjects/ptit/phap-luat-dai-cuong/subject.json', 'utf8'));

// Mock fetch
async function fetch(url) {
    // Remove query params
    const filePath = url.split('?')[0];
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return {
            ok: true,
            status: 200,
            json: async () => JSON.parse(content)
        };
    } catch (e) {
        return {
            ok: false,
            status: 404
        };
    }
}

// Logic from common.js
function getExamFilesPath() {
    const subject = subjectsData.find(s => s.id === 'phap-luat-dai-cuong');
    const examPath = currentSubjectData.examPath || 'exam';
    return subject ? `${subject.path}/${examPath}` : 'exam';
}

function getChapterFiles() {
    if (!currentSubjectData || !currentSubjectData.chapters) return [];
    const basePath = getExamFilesPath();
    return currentSubjectData.chapters.map(ch => `${basePath}/${ch.file}`);
}

const quizData = { chapters: [], questions: [] };

async function loadAllData() {
    const files = getChapterFiles();
    console.log('Loading files:', files);

    for (const file of files) {
        try {
            let data;
            const response = await fetch(file);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            data = await response.json();

            let chapterNum = 0;
            if (data.chapter) {
                chapterNum = data.chapter;
            } else if (data.title) {
                const match = data.title.match(/\d+/);
                if (match) chapterNum = parseInt(match[0]);
            }
            if (!chapterNum || chapterNum === 0) {
                const fileMatch = file.match(/\/(\d+)\.json$/) || file.match(/^(\d+)\.json$/);
                if (fileMatch) chapterNum = parseInt(fileMatch[1]);
            }

            console.log(`File: ${file} -> Chapter: ${chapterNum}, Questions: ${data.questions.length}`);

            quizData.questions.push(...data.questions.map(q => ({
                id: q.id,
                chapter: chapterNum
            })));

        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }
    return quizData;
}

loadAllData().then(data => {
    console.log('Total Loaded Questions:', data.questions.length);

    // Validate mapping for Topic 1 (Chapter 1, Q 1-56)
    const topic1Questions = data.questions.filter(q => q.chapter === 1 && q.id >= 1 && q.id <= 56);
    console.log('Topic 1 Questions Found:', topic1Questions.length);
});
