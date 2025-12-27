const fs = require('fs');

const corrections = [
    {
        file: 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/4.json',
        updates: {
            19: "Mối quan hệ giữa NLPL và NLHV: Cá nhân có năng lực hành vi thì chắc chắn đã có năng lực pháp luật (vì NLPL là tiền đề)."
        }
    },
    {
        file: 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/5.json',
        updates: {
            34: "Chủ thể vi phạm pháp luật cần phải có Năng lực trách nhiệm pháp lý (bao gồm độ tuổi và khả năng nhận thức). Năng lực pháp luật là tiền đề cần thiết.",
            40: "Theo Bộ luật Hình sự 2015, Pháp nhân thương mại cũng phải chịu trách nhiệm hình sự. Tuy nhiên, theo quan điểm truyền thống trước đây, trách nhiệm hình sự thường gắn liền với cá nhân.",
            59: "Theo quy định hiện hành, tổ chức cũng có thể là đối tượng bị truy cứu trách nhiệm pháp lý (ví dụ: vi phạm hành chính, dân sự, hình sự đối với pháp nhân thương mại).",
            60: "Thời hiệu truy cứu trách nhiệm pháp lý thường được tính từ ngày chấm dứt hành vi vi phạm (đối với vi phạm liên tục/kéo dài) hoặc từ ngày thực hiện hành vi vi phạm."
        }
    },
    {
        file: 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/6.json',
        updates: {
            2: "Nguyên tắc 'Quyền lực nhà nước là thống nhất, có sự phân công, phối hợp và kiểm soát giữa các cơ quan nhà nước...' là đặc trưng cơ bản của Nhà nước pháp quyền XHCN Việt Nam."
        }
    },
    {
        file: 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/7.json',
        updates: {
            35: "Bộ luật Lao động điều chỉnh quan hệ lao động giữa người làm công ăn lương với người sử dụng lao động và các quan hệ xã hội liên quan trực tiếp đến quan hệ lao động."
        }
    }
];

corrections.forEach(item => {
    if (fs.existsSync(item.file)) {
        const data = JSON.parse(fs.readFileSync(item.file, 'utf8'));
        let count = 0;
        data.questions.forEach(q => {
            if (item.updates[q.id]) {
                q.explain = item.updates[q.id];
                count++;
            }
        });
        if (count > 0) {
            fs.writeFileSync(item.file, JSON.stringify(data, null, 4), 'utf8');
            console.log(`Updated ${count} questions in ${item.file}`);
        }
    } else {
        console.error(`File not found: ${item.file}`);
    }
});
