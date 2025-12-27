const fs = require('fs');

const path = 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/5.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const explanations = {
    1: "Thực hiện pháp luật là quá trình hoạt động có mục đích làm cho quy định của pháp luật trở thành hành vi thực tế hợp pháp.",
    2: "Khẳng định B bị coi là sai (theo đáp án), tuy nhiên về lý thuyết hành vi thực hiện pháp luật phải là hành vi hợp pháp (loại trừ C). Có thể đề bài có nhầm lẫn.",
    3: "Áp dụng pháp luật cần thiết khi có vi phạm, tranh chấp hoặc cần nhà nước xác nhận quyền/nghĩa vụ.",
    4: "Có 4 hình thức thực hiện pháp luật: Tuân thủ, Thi hành, Sử dụng và Áp dụng pháp luật.",
    5: "Tuân thủ pháp luật là chủ thể kiềm chế không thực hiện những hành vi mà pháp luật cấm (Vd: Không vượt đèn đỏ).",
    6: "Tuân thủ pháp luật tương ứng với loại quy phạm pháp luật cấm đoán.",
    7: "Tuân thủ pháp luật mang tính thụ động (không làm gì cả - không hành động).",
    8: "Thi hành pháp luật mang tính chủ động (phải thực hiện hành vi tích cực để làm tròn nghĩa vụ).",
    9: "Thi hành pháp luật là nghĩa vụ bắt buộc, không phụ thuộc vào ý muốn chủ quan của chủ thể (trừ trường hợp tự nguyện thi hành).",
    10: "Sử dụng pháp luật tương ứng với quy phạm cho phép (quyền), nên không phải là bắt buộc.",
    11: "Áp dụng pháp luật là hoạt động đặc thù chỉ do các cơ quan Nhà nước có thẩm quyền (hoặc được trao quyền) thực hiện.",
    12: "Văn bản áp dụng pháp luật phải đúng thẩm quyền, phù hợp văn bản cấp trên và lợi ích hợp pháp.",
    13: "Áp dụng pháp luật mang tính cá biệt - cụ thể (áp dụng cho đối tượng xác định) và thể hiện quyền lực Nhà nước.",
    14: "Văn bản áp dụng pháp luật được ban hành trong hoạt động Áp dụng pháp luật.",
    15: "Khẳng định A bị coi là sai (theo đáp án), có lẽ do cách diễn đạt. Thực tế Áp dụng PL chính là một hình thức thực hiện PL của Nhà nước.",
    16: "Vi phạm pháp luật là hành vi trái pháp luật, có lỗi, do chủ thể có năng lực trách nhiệm pháp lý thực hiện.",
    17: "Vi phạm Nghị quyết Đảng (nếu là Đảng viên) được coi là vi phạm kỷ luật/quy định chính trị, trong ngữ cảnh rộng cũng là hành vi trái quy tắc.",
    18: "Vi phạm pháp luật là một hiện tượng xã hội (tiêu cực).",
    19: "Không tố giác người phạm tội là hành vi không hành động (không làm việc mà luật bắt buộc phải làm).",
    20: "Tiêu hủy gia cầm bệnh là biện pháp cưỡng chế hành chính (khắc phục hậu quả).",
    21: "Khẳng định A bị coi là sai. Vi phạm pháp luật phải là hành vi xác định (Hành động/Không hành động).",
    22: "Tương tự câu 21.",
    23: "Năng lực trách nhiệm pháp lý đòi hỏi độ tuổi và khả năng nhận thức (lý chí và ý chí).",
    24: "Không cho bạn mượn xe là quan hệ dân sự/đạo đức, không phải hành vi trái pháp luật (trừ khi có nghĩa vụ hợp đồng).",
    25: "Tương tự câu 21.",
    26: "Chia tay người yêu là quan hệ tình cảm/đạo đức, không phải vi phạm pháp luật.",
    27: "Mặt khách quan là những biểu hiện ra bên ngoài (Hành vi, Hậu quả, Mối quan hệ nhân quả...).",
    28: "4 yếu tố cấu thành: Chủ thể, Khách thể, Mặt chủ quan, Mặt khách quan.",
    29: "Mặt khách quan bao gồm hành vi, hậu quả và mối quan hệ nhân quả giữa chúng.",
    30: "Mặt chủ quan là diễn biến tâm lý bên trong (Lỗi, động cơ, mục đích).",
    31: "Mặt chủ quan gồm Lỗi, Động cơ và Mục đích.",
    32: "Khẳng định A là sai vì Vi phạm pháp luật có thể là Lỗi vô ý (không chỉ cố ý).",
    33: "Khẳng định A đúng: Tùy mức độ lỗi và loại vi phạm để xác định trách nhiệm (Vô ý hay cố ý sẽ xử lý khác nhau).",
    34: "Chủ thể vi phạm cần có Năng lực trách nhiệm pháp lý (theo lý thuyết chuẩn). Đáp án B chọn Năng lực pháp luật (là điều kiện cần).",
    35: "Khách thể của vi phạm pháp luật là các Quan hệ xã hội (hoặc Quan hệ pháp luật) được pháp luật bảo vệ.",
    36: "Khẳng định A bị coi là sai ở cụm từ 'được pháp luật xác lập'. Pháp luật bảo vệ QHXH, nhưng không phải QHXH nào cũng do luật xác lập (ví dụ quan hệ tài sản có trước luật).",
    37: "Nguyên nhân vi phạm pháp luật gồm khách quan (kinh tế, xã hội) và chủ quan (ý thức).",
    38: "Trách nhiệm hình sự mang tính cá nhân hóa cao, không thể chuyển giao/ủy thác.",
    39: "Chỉ có vi phạm pháp luật mới phát sinh trách nhiệm pháp lý (đây là nguyên tắc pháp chế).",
    40: "Theo BLHS 2015, Pháp nhân thương mại cũng chịu TNHS. Tuy nhiên đáp án D (Sai hết) có thể do đề cũ hoặc hiểu Tổ chức chung chung là sai.",
    41: "Vi phạm hình sự (Tội phạm) được quy định duy nhất trong Bộ luật Hình sự.",
    42: "Vi phạm hình sự còn gọi là Tội phạm.",
    43: "Vi phạm hành chính xâm phạm các Quy tắc quản lý Nhà nước.",
    44: "Vi phạm dân sự xâm phạm các quan hệ tài sản và nhân thân.",
    45: "Đối tượng của hành vi thuộc mặt khách quan (hoặc khách thể), không thuộc mặt chủ quan.",
    46: "Trách nhiệm hình sự nghiêm khắc nhất, do Tòa án áp dụng.",
    47: "Trách nhiệm dân sự do Tòa án áp dụng (khi có tranh chấp kiện tụng).",
    48: "Trách nhiệm hành chính do cơ quan quản lý Nhà nước áp dụng (Chủ tịch UBND, CSGT...).",
    49: "Trách nhiệm kỷ luật do Thủ trưởng cơ quan/đơn vị (Hiệu trưởng) áp dụng.",
    50: "Một hành vi vi phạm pháp luật thường cũng là vi phạm đạo đức (nhưng không phải luôn luôn).",
    51: "Chủ thể chịu trách nhiệm khi có Năng lực trách nhiệm pháp lý (Tuổi + Nhận thức).",
    52: "Khẳng định B sai vì một số trường hợp có thể được miễn trách nhiệm pháp lý hoặc xử lý bằng biện pháp khác không mang tính cưỡng chế nặng nề (hòa giải).",
    53: "Mặt chủ quan gồm: Lỗi, Động cơ, Mục đích.",
    54: "Chủ thể có lỗi khi có khả năng nhận thức nhưng đã lựa chọn hành vi sai trái (Cố ý hoặc Vô ý).",
    55: "Buôn bán gia cầm bệnh là vi phạm quy định thú y/vệ sinh (Hành chính). Các hành vi khác là Tội phạm (Hình sự) hoặc Kỷ luật.",
    56: "Chứa chấp mại dâm là Tội phạm (Hình sự). Các hành vi khác là Hành chính.",
    57: "Không trả tiền thuê nhà là vi phạm nghĩa vụ hợp đồng (Dân sự).",
    58: "Cơ sở truy cứu là Hành vi vi phạm và Thời hiệu.",
    59: "Đáp án C 'Chỉ áp dụng với cá nhân' là sai theo luật hiện hành (Tổ chức cũng bị). Có thể đề cũ hoặc lỗi.",
    60: "Thời hiệu thường tính từ thời điểm vi phạm kết thúc (với vi phạm liên tục) hoặc thời điểm thực hiện hành vi. Đáp án D có thể đúng nếu các mốc A, B, C không chính xác hoàn toàn."
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
