const fs = require('fs');

const path = 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/4.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const explanations = {
    1: "Liên minh Châu Âu (EU) chính thức mang tên gọi này từ năm 1993 (Hiệp ước Maastricht). (Lưu ý: Đáp án đề thi chọn A 1963 có thể không chính xác về mặt lịch sử).",
    2: "Quan hệ pháp luật là những quan hệ xã hội được các quy phạm pháp luật điều chỉnh, trong đó các bên có quyền và nghĩa vụ pháp lý.",
    3: "Quan hệ pháp luật bản chất là một loại Quan hệ xã hội (được pháp luật điều chỉnh).",
    4: "Quan hệ pháp luật là một hình thức đặc biệt của Quan hệ xã hội.",
    5: "Quan hệ xã hội và quan hệ pháp luật đều là những quan hệ nảy sinh trong đời sống xã hội giữa người với người.",
    6: "Để quan hệ xã hội trở thành quan hệ pháp luật cần phải có sự điều chỉnh của pháp luật (quy phạm pháp luật).",
    7: "Quan hệ vợ chồng (Hôn nhân) là quan hệ pháp luật (được Luật Hôn nhân gia đình điều chỉnh). Tình yêu, bạn bè là quan hệ xã hội/đạo đức.",
    8: "Đặc điểm của quan hệ pháp luật là mang tính ý chí của Nhà nước (thông qua quy phạm pháp luật).",
    9: "Quan hệ pháp luật mang tính ý chí, đó là ý chí của Nhà nước và ý chí của các bên tham gia.",
    10: "Quan hệ pháp luật là quan hệ xã hội được điều chỉnh bởi các quy phạm pháp luật.",
    11: "Quy phạm pháp luật chỉ làm nảy sinh quan hệ pháp luật khi có Sự kiện pháp lý xảy ra trên thực tế.",
    12: "Quan hệ pháp luật phát sinh, thay đổi, chấm dứt dưới tác động của Sự kiện pháp lý.",
    13: "Nội dung của quan hệ pháp luật là tổng thể các Quyền và Nghĩa vụ pháp lý của các chủ thể tham gia.",
    14: "Để trở thành chủ thể quan hệ pháp luật, cá nhân/tổ chức phải có Năng lực chủ thể (gồm Năng lực pháp luật và Năng lực hành vi).",
    15: "Cấu trúc của quan hệ pháp luật gồm 3 yếu tố: Chủ thể, Khách thể và Nội dung.",
    16: "Chủ thể của quan hệ pháp luật là các cá nhân, tổ chức có đủ năng lực chủ thể theo quy định của pháp luật.",
    17: "Năng lực pháp luật của cá nhân có từ khi sinh ra và chấm dứt khi chết.",
    18: "Khẳng định D là sai vì Năng lực pháp luật có thể được quy định trong cả văn bản dưới luật, không chỉ văn bản luật.",
    19: "Mối quan hệ giữa NLPL và NLHV: Có NLHV thì chắc chắn có NLPL. (Đáp án D chọn tất cả đúng có thể theo quan điểm riêng của giáo trình).",
    20: "Năng lực hành vi của cá nhân chỉ xuất hiện khi đạt độ tuổi nhất định và khả năng nhận thức bình thường.",
    21: "Pháp nhân phải hội đủ 4 điều kiện: Thành lập hợp pháp, Cơ cấu tổ chức chặt chẽ, Tài sản độc lập, Nhân danh mình tham gia QHPL.",
    22: "Chỉ những cá nhân, tổ chức có đủ điều kiện do pháp luật quy định (năng lực chủ thể) mới trở thành chủ thể QHPL.",
    23: "Quyền chủ thể bao gồm quyền tự xử sự, quyền yêu cầu người khác thực hiện nghĩa vụ, và quyền yêu cầu Nhà nước bảo vệ.",
    24: "Nghĩa vụ pháp lý bao gồm: Phải thực hiện hành vi nhất định, Kiềm chế không thực hiện hành vi cấm, và Chịu trách nhiệm pháp lý.",
    25: "Khách thể của quan hệ pháp luật là những lợi ích vật chất hoặc tinh thần mà các chủ thể hướng tới.",
    26: "Sự kiện pháp lý là những sự kiện thực tế mà sự xuất hiện/biến mất của chúng được pháp luật gắn với việc phát sinh/thay đổi/chấm dứt QHPL.",
    27: "Mọi chủ thể tham gia QHPL đều có các quyền và nghĩa vụ pháp lý nhất định.",
    28: "Quan hệ pháp luật là quan hệ xã hội chứ không phải do Nhà nước 'tạo ra' (Nhà nước chỉ điều chỉnh).",
    29: "Năng lực pháp luật là khả năng hưởng quyền và gánh vác nghĩa vụ do Nhà nước quy định.",
    30: "Năng lực hành vi là khả năng của chủ thể bằng hành vi của mình xác lập, thực hiện quyền và nghĩa vụ.",
    31: "Năng lực pháp luật và năng lực hành vi là những thuộc tính pháp lý (do pháp luật quy định), không phải thuộc tính tự nhiên.",
    32: "Khẳng định sai là C (cho rằng là thuộc tính tự nhiên). Thực chất là thuộc tính pháp lý.",
    33: "Cá nhân là chủ thể phổ biến nhất và tham gia đông đảo nhất vào các quan hệ pháp luật."
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
