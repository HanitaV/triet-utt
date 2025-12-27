
import json

def update_chapter_1():
    file_path = r'c:\Users\eleven\triet-utt\exam\chuong_1.json'
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    explanations = {
        1: "Theo Giáo trình Triết học Mác-Lênin, triết học ra đời vào khoảng từ thế kỷ VIII đến thế kỷ VI trước Công nguyên tại các trung tâm văn minh lớn của nhân loại thời Cổ đại.",
        2: "Triết học ra đời sớm nhất ở phương Đông (Ấn Độ, Trung Quốc) và phương Tây (Hy Lạp - La Mã).",
        3: "Triết học là hệ thống tri thức lý luận chung nhất của con người về thế giới và vị trí của con người trong thế giới đó.",
        4: "Triết học ra đời khi có hai điều kiện: tư duy của con người đạt trình độ trừu tượng hóa, khái quát hóa cao và xã hội có sự phân chia lao động chân tay và lao động trí óc.",
        5: "Thời kỳ Cổ đại, triết học bao gồm mọi tri thức của nhân loại, nên được gọi là 'Triết học tự nhiên' hay 'Khoa học của mọi khoa học'.",
        6: "Thời kỳ Trung cổ (thế kỷ V-XIV) ở Tây Âu, triết học bị chi phối bởi thần học Kitô giáo, mang tính chất Kinh viện, xa rời thực tế.",
        7: "Ph.Ăngghen đã định nghĩa: 'Vấn đề cơ bản lớn của mọi triết học, đặc biệt là của triết học hiện đại, là vấn đề quan hệ giữa tư duy và tồn tại'.",
        8: "Đến thời kỳ Phục hưng và Cận đại, các bộ môn khoa học chuyên ngành dần tách ra khỏi triết học, chấm dứt quan niệm triết học là 'Khoa học của mọi khoa học'.",
        9: "Chủ nghĩa duy tâm chủ quan phủ nhận sự tồn tại khách quan của hiện thực, coi sự vật là phức hợp của các cảm giác.",
        10: "Chủ nghĩa duy tâm khách quan thừa nhận tính thứ nhất của ý thức nhưng đó là thứ tinh thần khách quan (Ý niệm tuyệt đối, Tinh thần thế giới) có trước và tồn tại độc lập với con người.",
        11: "Chủ nghĩa duy vật thời Cổ đại mang tính trực quan, cảm tính, ngây thơ, chất phác, đồng nhất vật chất với vật thể cụ thể.",
        12: "Đặc điểm của Chủ nghĩa duy vật thời Cổ đại là đồng nhất vật chất với một hay một số chất cụ thể (nước, lửa, không khí...).",
        13: "Thuyết nhị nguyên xem vật chất và ý thức là hai bản nguyên song song tồn tại, cùng quyết định sự vận động của thế giới.",
        14: "Vấn đề cơ bản của triết học có hai mặt: Mặt thứ nhất là Bản thể luận (Vật chất hay ý thức có trước?), Mặt thứ hai là Nhận thức luận (Con người có khả năng nhận thức thế giới không?).",
        15: "Khả tri luận (Thuyết có thể biết) thừa nhận con người có khả năng nhận thức được thế giới.",
        16: "Bất khả tri luận (Thuyết không thể biết) cho rằng con người không thể nhận thức được bản chất thực sự của thế giới.",
        17: "Hoài nghi luận nghi ngờ khả năng đạt được chân lý khách quan của con người, thường nâng sự hoài nghi lên thành nguyên tắc.",
        18: "Phương pháp siêu hình nhận thức đối tượng ở trạng thái cô lập, tĩnh tại, không vận động, không phát triển.",
        19: "Thế kỷ XVII-XVIII, phương pháp siêu hình máy móc thống trị trong tư duy triết học và khoa học tự nhiên.",
        20: "Phương pháp siêu hình chỉ nhìn thấy cây mà không thấy rừng, xem xét sự vật trong trạng thái cô lập.",
        21: "Phương pháp biện chứng nhận thức đối tượng trong các mối liên hệ phổ biến, vận động và phát triển không ngừng.",
        22: "Phương pháp biện chứng không những nhìn thấy cây mà còn nhìn thấy cả rừng, thấy mối liên hệ biện chứng giữa các sự vật.",
        23: "Lịch sử phép biện chứng trải qua 3 hình thức: Phép biện chứng chất phác thời Cổ đại -> Phép biện chứng duy tâm (Cổ điển Đức) -> Phép biện chứng duy vật (Mác-Lênin).",
        24: "Nguồn gốc lý luận của triết học Mác-Lênin gồm: Triết học cổ điển Đức, Kinh tế chính trị cổ điển Anh, và Chủ nghĩa xã hội không tưởng Pháp.",
        25: "Ba tiền đề khoa học tự nhiên: Định luật bảo toàn và chuyển hóa năng lượng, Học thuyết tế bào, và Học thuyết tiến hóa của Đác-uyn.",
        26: "Chức năng cơ bản của triết học Mác-Lênin là cung cấp thế giới quan duy vật biện chứng và phương pháp luận biện chứng duy vật.",
        27: "Chủ nghĩa duy tâm cho rằng ý thức có trước, vật chất có sau, nên phủ nhận tính khách quan của thế giới vật chất.",
        28: "Mặt tích cực của CNDV Cổ đại là chống lại quan điểm duy tâm tôn giáo, đặt nền móng cho sự phát triển của tư tưởng khoa học.",
        29: "Chủ nghĩa duy vật siêu hình thế kỷ XVII-XVIII thường đồng nhất vật chất với khối lượng.",
        30: "C.Mác và Ph.Ăngghen là những người sáng lập, còn V.I.Lênin là người bảo vệ và phát triển triết học Mác.",
        31: "Triết học Mác ra đời vào những năm 40 của thế kỷ XIX.",
        32: "Điều kiện kinh tế - xã hội: Phương thức sản xuất tư bản chủ nghĩa đã phát triển mạnh mẽ và bộc lộ mâu thuẫn, giai cấp vô sản đã bước lên vũ đài lịch sử.",
        33: "Câu nói này của C.Mác khẳng định triết học là sản phẩm của thời đại.",
        34: "Quan hệ giữa quy luật triết học và quy luật khoa học cụ thể là quan hệ giữa cái chung (triết học) và cái riêng (khoa học cụ thể).",
        35: "Triết học Mác-Lênin là sự thống nhất hữu cơ giữa thế giới quan duy vật và phương pháp luận biện chứng.",
        36: "Chức năng thế giới quan và phương pháp luận là hai chức năng cơ bản nhất.",
        37: "Trong Tuyên ngôn của Đảng Cộng sản, Mác và Ăngghen ca ngợi vai trò lịch sử của Giai cấp tư sản trong việc phát triển lực lượng sản xuất.",
        38: "Giai đoạn 1841-1844 là thời kỳ hình thành tư tưởng triết học của Mác và Ăngghen, chuyển từ duy tâm sang duy vật, từ dân chủ cách mạng sang cộng sản chủ nghĩa.",
        39: "Giai đoạn 1844-1847 là thời kỳ đề xuất những nguyên lý cơ bản của triết học duy vật biện chứng và duy vật lịch sử.",
        40: "Giai đoạn 1848-1895 là thời kỳ bổ sung và phát triển toàn diện lý luận triết học mác-xít thông qua thực tiễn cách mạng.",
        41: "Đây là giai đoạn khởi đầu (1841-1844) trong quá trình hình thành triết học Mác.",
        42: "Giai đoạn 1848-1895 gắn liền với việc tổng kết kinh nghiệm các cuộc cách mạng ở châu Âu.",
        43: "Các tác phẩm như 'Bản thảo kinh tế - triết học 1844', 'Hệ tư tưởng Đức'... ra đời trong giai đoạn 1844-1847.",
        44: "Thời kỳ 1893-1907: Lênin bảo vệ và phát triển triết học Mác trong cuộc đấu tranh chống phái Dân túy và chuẩn bị thành lập Đảng vô sản kiểu mới.",
        45: "Thời kỳ 1907-1917: Lênin phát triển toàn diện triết học Mác trong bối cảnh chuẩn bị cho Cách mạng Tháng Mười Nga.",
        46: "Thời kỳ 1917-1924: Tổng kết thực tiễn Cách mạng Tháng Mười và xây dựng CNXH.",
        47: "Giai đoạn 1893-1907 là thời kỳ đấu tranh thành lập Đảng.",
        48: "Giai đoạn 1907-1917 gắn liền với sự chuẩn bị trực tiếp cho Cách mạng xã hội chủ nghĩa.",
        49: "Đối tượng của triết học Mác-Lênin là giải quyết mối quan hệ vật chất - ý thức và nghiên cứu những quy luật chung nhất của tự nhiên, xã hội và tư duy.",
        50: "Tôn giáo thường dựa trên cơ sở lý luận của Chủ nghĩa duy tâm để giải thích thế giới theo hướng thần thánh hóa."
    }

    count = 0
    for q in data['questions']:
        q_id = q['id']
        if q_id in explanations:
            q['explain'] = explanations[q_id]
            count += 1
            
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print(f"Updated explanations for {count} questions in Chapter 1.")

if __name__ == "__main__":
    update_chapter_1()
