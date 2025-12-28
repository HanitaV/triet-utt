const fs = require('fs');
const path = require('path');

const baseDir = 'subjects/utt/triet-mac-lenin';
const subjectFile = path.join(baseDir, 'subject.json');
const studyDataFile = path.join(baseDir, 'study_data.json');
const logFile = 'report.log';

fs.writeFileSync(logFile, ''); // Clear file

function log(msg) {
    fs.appendFileSync(logFile, msg + '\r\n'); // Use CRLF for Windows readability
    console.log(msg);
}

async function verify() {
    if (!fs.existsSync(subjectFile) || !fs.existsSync(studyDataFile)) {
        log('Error: Data files not found at ' + baseDir);
        return;
    }

    const subject = JSON.parse(fs.readFileSync(subjectFile, 'utf8'));
    const studyTopics = JSON.parse(fs.readFileSync(studyDataFile, 'utf8'));

    const questionsByChapter = {};

    log('Loading chapters...');
    for (const ch of subject.chapters) {
        const filePath = path.join(baseDir, 'exam', ch.file);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            questionsByChapter[ch.id] = data.questions;
            log(`Loaded ${ch.file}: ${data.questions.length} questions (Chapter ${ch.id})`);
        } else {
            log(`File not found: ${filePath}`);
        }
    }

    log('\nVerifying Topics...');

    studyTopics.forEach(topic => {
        let totalListed = 0;
        let totalFound = 0;
        let missingIds = [];

        if (topic.questionIds) {
            for (const [chapterKey, ids] of Object.entries(topic.questionIds)) {
                totalListed += ids.length;

                const chapterQuestions = questionsByChapter[chapterKey] || [];
                const found = ids.filter(id => chapterQuestions.find(q => q.id === id));
                totalFound += found.length;

                const missing = ids.filter(id => !chapterQuestions.find(q => q.id === id));
                if (missing.length > 0) {
                    missingIds.push({ chapter: chapterKey, ids: missing });
                }
            }
        }

        log(`Topic ${topic.id}: "${topic.title}"`);
        log(`  Listed IDs: ${totalListed}, Found IDs: ${totalFound}`);
        if (totalListed === 0) {
            log(`  WARNING: No questions listed for this topic!`);
        } else if (totalFound === 0) {
            log(`  ERROR: All questions missing for this topic!`);
        } else if (totalFound < totalListed) {
            log(`  WARNING: Some questions missing. Missing: ${JSON.stringify(missingIds)}`);
        }
    });

    log('\nVerifying Videos...');
    studyTopics.forEach(topic => {
        if (topic.videos) {
            topic.videos.forEach(video => {
                let totalListed = 0;
                let totalFound = 0;

                if (video.questionIds) {
                    for (const [chapterKey, ids] of Object.entries(video.questionIds)) {
                        totalListed += ids.length;
                        const chapterQuestions = questionsByChapter[chapterKey] || [];
                        const found = ids.filter(id => chapterQuestions.find(q => q.id === id));
                        totalFound += found.length;
                    }
                }

                if (totalListed === 0) {
                    log(`  WARNING: Video "${video.title}" in Topic ${topic.id} has NO questions assigned.`);
                } else if (totalListed > 0 && totalFound === 0) {
                    log(`  Video "${video.title}" in Topic ${topic.id}: All questions missing (Listed ${totalListed})`);
                }
            });
        }
    });
}

verify();
