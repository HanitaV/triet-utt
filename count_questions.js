const fs = require('fs');
const path = 'subjects/ptit/phap-luat-dai-cuong/exam';

function count() {
    for (let i = 1; i <= 7; i++) {
        try {
            const data = fs.readFileSync(`${path}/${i}.json`, 'utf8');
            const json = JSON.parse(data);
            console.log(`Chapter ${i}: ${json.questions ? json.questions.length : '0'}`);
        } catch (e) {
            console.log(`Chapter ${i}: Error ${e.message}`);
        }
    }
}
count();
