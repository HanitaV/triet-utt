const fs = require('fs');
const path = require('path');

const file = 'subjects/utt/triet-mac-lenin/exam/chuong_2.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const keywords = ['khả năng', 'hiện thực'];
const matches = [];

data.questions.forEach(q => {
    // Check Question Text & Explanation
    let text = (q.question + ' ' + (q.explain || '')).toLowerCase();

    // Check Options
    if (q.options) {
        q.options.forEach(opt => {
            text += ' ' + opt.content.toLowerCase();
        });
    }

    if (keywords.some(k => text.includes(k))) {
        matches.push({
            id: q.id,
            question: q.question,
            options: q.options
        });
    }
});

console.log(JSON.stringify(matches, null, 2));
