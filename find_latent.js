const fs = require('fs');
const file = 'subjects/utt/triet-mac-lenin/exam/chuong_2.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const keywords = ['chưa có', 'sẽ có', 'tương lai', 'tiền đề', 'tiềm năng'];
const matches = [];

data.questions.forEach(q => {
    let text = (q.question + ' ' + (q.explain || '')).toLowerCase();
    if (q.options) {
        q.options.forEach(opt => text += ' ' + opt.content.toLowerCase());
    }

    if (keywords.some(k => text.includes(k))) {
        matches.push({ id: q.id, question: q.question });
    }
});

console.log(JSON.stringify(matches, null, 2));
