const fs = require('fs');

const path = 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/7.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const explanations = {
    1: "Hiến pháp là đạo luật cơ bản, có hiệu lực pháp lý cao nhất, quy định những vấn đề cốt lõi của quốc gia.",
    2: "Công dân đủ 21 tuổi trở lên có quyền ứng cử vào Quốc hội và Hội đồng nhân dân.",
    3: "Hiến pháp khác các luật khác ở đối tượng điều chỉnh (rộng nhất), hiệu lực (cao nhất) và thủ tục sửa đổi (nghiêm ngặt).",
    4: "Công dân đủ 18 tuổi trở lên có quyền bầu cử.",
    5: "Hiến pháp quy định các quyền và nghĩa vụ cơ bản (nền tảng) của công dân.",
    6: "Quyền và nghĩa vụ công dân được quy định cụ thể trong rất nhiều văn bản luật (Dân sự, Hình sự, Lao động, HNGĐ...).",
    7: "Ứng cử vào cơ quan quyền lực nhà nước (QH, HĐND) yêu cầu đủ 21 tuổi.",
    8: "Lịch sử lập hiến (trước 2013) ghi nhận các bản Hiến pháp: 1946, 1959, 1980, 1992.",
    9: "Theo dữ liệu của đề thi này (cũ), Hiến pháp đang có hiệu lực là Hiến pháp 1992. (Hiện nay là 2013).",
    10: "Luật Hiến pháp điều chỉnh các quan hệ cơ bản nhất về chính trị, kinh tế, xã hội, tổ chức bộ máy nhà nước...",
    11: "Câu hỏi có thể đề cập đến đợt sửa đổi lớn năm 2001 (Nghị quyết 51/2001). Thực tế HP 1992 được thay thế bởi HP 2013.",
    12: "Hiến pháp được thông qua khi có ít nhất 2/3 tổng số đại biểu Quốc hội tán thành.",
    13: "Thủ tướng Chính phủ bắt buộc phải là Đại biểu Quốc hội (được QH bầu trong số các ĐB).",
    14: "Dữ liệu đề thi phân chia theo hệ thống cũ/lý thuyết đặc thù gồm: Cơ quan quyền lực (QH, HĐND), Quản lý (CP, UBND), Kiểm sát, Xét xử.",
    15: "Cơ quan quyền lực nhà nước là các cơ quan đại diện do dân bầu: Quốc hội và Hội đồng nhân dân.",
    16: "Chủ tịch nước là người đứng đầu Nhà nước, thay mặt nước CHXHCN Việt Nam về đối nội và đối ngoại.",
    17: "Chính phủ là cơ quan hành chính nhà nước cao nhất, thực hiện quyền hành pháp, là cơ quan chấp hành của Quốc hội.",
    18: "Viện Kiểm sát có chức năng: Thực hành quyền công tố và Kiểm sát các hoạt động tư pháp (Lưu ý: Luật cũ còn có kiểm sát tuân theo pháp luật).",
    19: "Quan hệ pháp luật hành chính mang tính quyền lực - phục tùng (bất bình đẳng về ý chí), nên khẳng định 'địa vị ngang nhau' là sai.",
    20: "Phương pháp điều chỉnh của Luật Hành chính là phương pháp mệnh lệnh đơn phương.",
    21: "Cơ quan thuộc Chính phủ (như VTV, VOV...) không được coi là 'Cơ quan hành chính nhà nước' (có chức năng quản lý nhà nước) theo nghĩa hẹp.",
    22: "Cơ quan hành chính ở địa phương là Ủy ban nhân dân và các cơ quan chuyên môn (Sở, Phòng...). HĐND là cơ quan quyền lực.",
    23: "Đảng lãnh đạo bằng cương lĩnh, đường lối, công tác cán bộ, kiểm tra giám sát... không dùng biện pháp 'cưỡng chế' hành chính.",
    24: "Quan hệ hành chính luôn có ít nhất một bên mang quyền lực nhà nước.",
    25: "Vi phạm hành chính: Trái luật, Xâm phạm quy tắc quản lý, Có lỗi, Không phải tội phạm.",
    26: "Các trường hợp không xử lý: Tình thế cấp thiết, Phòng vệ chính đáng, Sự kiện bất ngờ, Mất năng lực hành vi (Tâm thần).",
    27: "Hình thức xử phạt chính gồm: Cảnh cáo và Phạt tiền. (Các hình thức khác như tước giấy phép có thể là chính hoặc bổ sung).",
    28: "Người từ đủ 14 tuổi bắt đầu chịu trách nhiệm hành chính (về vi phạm cố ý).",
    29: "Người từ đủ 14 đến dưới 16 tuổi chỉ bị phạt Cảnh cáo (không phạt tiền).",
    30: "Người từ đủ 14-16 chịu trách nhiệm về vi phạm cố ý. Từ đủ 16 trở lên chịu trách nhiệm về mọi vi phạm (trừ một số ngoại lệ của luật).",
    31: "Người chưa thành niên (16-18) bị phạt tiền thì mức phạt không quá 1/2 mức người thành niên. Nếu không có tiền, cha mẹ phải nộp thay (theo luật cũ/nguyên tắc giám hộ).",
    32: "Luật Lao động điều chỉnh Quan hệ lao động và các quan hệ liên quan trực tiếp.",
    33: "Học nghề là một quan hệ liên quan trực tiếp đến quan hệ lao động.",
    34: "Việc làm là hoạt động tạo ra thu nhập và không bị pháp luật cấm.",
    35: "Theo đáp án D, cả A và B đều 'sai' (có thể do thiếu sót hoặc quan điểm cũ). Thực tế BLLĐ điều chỉnh cả hai.",
    36: "Tiền lương là chế định trung tâm của Luật Lao động.",
    37: "Hợp đồng lao động chủ yếu gồm: Công việc, Lương, Thời giờ, Điều kiện an toàn v.v."
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
