const fs = require('fs');

const path = 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/3.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const explanations = {
    1: "Theo Công ước Luật Biển 1982 và thực tiễn, các quốc gia vành đai Bắc Cực có quyền chủ quyền/lãnh thổ mở rộng theo quy tắc ngành quạt hoặc các nguyên tắc quốc tế đặc thù.",
    2: "Việt Nam áp dụng phương pháp đường cơ sở thẳng gãy khúc (Tuyên bố 1977) để tính chiều rộng lãnh hải.",
    3: "Nguyên tắc tự do biển cả được hình thành và phát triển mạnh mẽ từ thời kỳ Phong kiến (cuối kỳ) và Tư bản chủ nghĩa.",
    4: "Chủ thể của Công pháp quốc tế gồm: Quốc gia, Dân tộc đang đấu tranh giành độc lập, Tổ chức quốc tế liên chính phủ (và một số chủ thể đặc biệt khác).",
    5: "Công pháp quốc tế phát triển qua 4 thời kỳ: Cổ đại, Trung đại, Cận đại và Hiện đại.",
    6: "Điều lệ Đoàn Thanh niên là văn bản nội bộ của tổ chức chính trị - xã hội, không phải là Văn bản quy phạm pháp luật (do cơ quan nhà nước ban hành).",
    7: "Các vùng biển thuộc chủ quyền quốc gia gồm: Nội thủy và Lãnh hải. (Vùng tiếp giáp, ĐQKT, Thềm lục địa thuộc quyền chủ quyền).",
    8: "Điều lệ Hội Cựu chiến binh là văn bản của tổ chức xã hội, không phải là Văn bản quy phạm pháp luật.",
    9: "Nghị quyết của Đảng là văn bản lãnh đạo chính trị, không phải là Văn bản quy phạm pháp luật của Nhà nước.",
    10: "Quy phạm pháp luật là quy tắc xử sự mang tính bắt buộc chung, do Nhà nước ban hành, điều chỉnh các quan hệ xã hội.",
    11: "Quy phạm pháp luật là những quy tắc xử sự chung do Nhà nước ban hành và bảo đảm thực hiện.",
    12: "Quy phạm pháp luật chỉ tồn tại trong xã hội có giai cấp và có Nhà nước.",
    13: "Quy phạm pháp luật là công cụ điều chỉnh các quan hệ xã hội do Nhà nước ban hành.",
    14: "Quy phạm pháp luật và quy phạm xã hội vừa có điểm giống nhau (đều là quy tắc xử sự) vừa có điểm khác nhau (nguồn gốc, tính cưỡng chế).",
    15: "Trong xã hội có giai cấp, quy phạm pháp luật là công cụ quan trọng nhất để duy trì trật tự xã hội.",
    16: "Đặc điểm khác biệt nhất của pháp luật là tính cưỡng chế nhà nước (do cơ quan NN ban hành và bảo đảm thực hiện).",
    17: "Cấu trúc của quy phạm pháp luật gồm 3 bộ phận: Giả định, Quy định và Chế tài (tuy nhiên không phải lúc nào cũng thể hiện đầy đủ trong một điều luật).",
    18: "Bộ phận Quy định và Chế tài đều chứa đựng mệnh lệnh của Nhà nước (Quy định: phải làm gì; Chế tài: bị phạt thế nào).",
    19: "Bộ phận Giả định nêu lên những điều kiện, hoàn cảnh thực tế mà quy phạm sẽ tác động.",
    20: "Có quan điểm cho rằng một quy phạm pháp luật đầy đủ không thể thiếu Giả định và Chế tài (để đảm bảo tính nghiêm minh).",
    21: "Bộ phận Quy định và Chế tài là rất quan trọng vì nó thể hiện nội dung quy tắc xử sự và biện pháp bảo đảm.",
    22: "Chế tài là bộ phận bảo đảm cho pháp luật được thực hiện nghiêm chỉnh thông qua đe dọa trừng phạt.",
    23: "Bộ phận Quy định đưa ra giới hạn cho phép, cấm đoán hoặc bắt buộc thực hiện hành vi.",
    24: "Giả định phức hợp là giả định nêu lên nhiều điều kiện, hoàn cảnh có mối liên hệ với nhau.",
    25: "Chế tài là bộ phận ghi nhận các biện pháp cưỡng chế nhà nước áp dụng đối với chủ thể vi phạm.",
    26: "Cấu trúc thông thường gồm: Giả định, Quy định, Chế tài (theo lý thuyết truyền thống).",
    27: "Hệ thống pháp luật là tổng thể các quy phạm pháp luật có mối liên hệ thống nhất, phân thành chế định, ngành luật...",
    28: "Cấu trúc hệ thống pháp luật gồm cấu trúc bên trong (QPPL, Chế định, Ngành) và hình thức biểu hiện bên ngoài (Văn bản QPPL).",
    29: "Cấu trúc bên trong gồm: Quy phạm pháp luật, Chế định pháp luật và Ngành luật.",
    30: "Hình thức biểu hiện bên ngoài là hệ thống các Văn bản quy phạm pháp luật.",
    31: "Quy phạm pháp luật là đơn vị nhỏ nhất cấu thành nên hệ thống pháp luật (tế bào của hệ thống pháp luật).",
    32: "Chế định pháp luật là nhóm các quy phạm pháp luật điều chỉnh một nhóm quan hệ xã hội cùng tính chất.",
    33: "Ngành luật là hệ thống các quy phạm pháp luật điều chỉnh các quan hệ xã hội cùng loại trong một lĩnh vực nhất định.",
    34: "Văn bản quy phạm pháp luật do Cơ quan nhà nước có thẩm quyền ban hành theo trình tự, thủ tục luật định.",
    35: "Thứ bậc hiệu lực: Hiến pháp > Bộ luật/Luật > Văn bản dưới luật (Pháp lệnh, Nghị định...).",
    36: "Hệ thống pháp luật hoàn thiện cần đảm bảo: Tính toàn diện, đồng bộ, phù hợp và kỹ thuật lập pháp cao.",
    37: "Trình tự trình bày các bộ phận Giả định, Quy định, Chế tài trong văn bản luật không nhất thiết phải theo thứ tự cố định.",
    38: "Các cơ quan được phép ban hành Nghị quyết (là VBQPPL): Quốc hội, UBTVQH, Hội đồng nhân dân (và Chính phủ theo Luật 2008, Luật 2015 CP ban hành Nghị định là chủ yếu nhưng vẫn có Nghị quyết của QH). Đáp án là D: Cả 3 nhóm (Quốc hội, Chính phủ (cũ/cá biệt), HĐND). Lưu ý: Theo Luật 2015 Chính phủ ban hành Nghị định.",
    39: "Chủ tịch nước ban hành Lệnh và Quyết định.",
    40: "Bộ trưởng ban hành Thông tư.",
    41: "Hội đồng nhân dân ban hành Nghị quyết.",
    42: "Viện trưởng VKSNDTC không có quyền ban hành Nghị quyết (chỉ ban hành Quyết định, Chỉ thị, Thông tư).",
    43: "Thủ tướng Chính phủ không có quyền ban hành Nghị quyết (Thủ tướng ban hành Quyết định).",
    44: "Văn bản quy phạm pháp luật có hiệu lực sau khi đăng công báo hoặc công bố một thời gian (thường là sau một khoảng thời gian nhất định).",
    45: "Văn bản QPPL của trung ương có hiệu lực không sớm hơn 45 ngày kể từ ngày công bố/ký ban hành.",
    46: "Khi văn bản mới thay thế văn bản cũ thì văn bản cũ sẽ chấm dứt hiệu lực.",
    47: "Hiệu lực hồi tố chỉ được áp dụng trong những trường hợp thật cần thiết và đảm bảo nguyên tắc nhân đạo (có lợi cho đối tượng).",
    48: "Hệ thống pháp luật hoàn thiện dựa trên tính thống nhất, toàn diện, đồng bộ, phù hợp và kỹ thuật pháp lý cao."
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
