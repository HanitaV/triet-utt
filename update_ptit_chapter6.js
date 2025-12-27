const fs = require('fs');

const path = 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/6.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const explanations = {
    1: "Pháp chế là nguyên tắc đòi hỏi sự tuân thủ nghiêm chỉnh pháp luật của mọi chủ thể, không đồng nghĩa với 'cưỡng chế' (biện pháp bắt buộc).",
    2: "Nguyên tắc 'Quyền lực nhà nước là thống nhất...' là đặc trưng cơ bản của Nhà nước pháp quyền XHCN Việt Nam. (Tuy nhiên đáp án D được chọn có thể theo cách hiểu rộng về tính thống nhất quyền lực trong nhà nước pháp quyền/dân chủ)."
};

let updatedCount = 0;
data.questions.forEach(q => {
    if (explanations[q.id]) {
        q.explain = explanations[q.id];
        updatedCount++;
    }
});

console.log(`Updated ${updatedCount} questions.`);
fs.writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
console.log('File saved.');
