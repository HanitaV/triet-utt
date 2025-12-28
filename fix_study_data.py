import json
import os
import re

# Paths
base_path = 'c:/Users/eleven/triet-utt/subjects/utt/triet-mac-lenin'
study_data_file = os.path.join(base_path, 'study_data.json')
exam_dir = os.path.join(base_path, 'exam')

# 1. DEFINE KEYWORDS
topic_keywords = {
    1: ["khái lược", "nguồn gốc nhận thức", "nguồn gốc xã hội", "thế kỷ", "ấn độ", "trung quốc", "hy lạp", "la mã", "vấn đề cơ bản", "tư duy và tồn tại", "vật chất và ý thức", "duy vật", "duy tâm", "nhất nguyên", "nhị nguyên", "khả tri", "bất khả tri", "hoài nghi", "siêu hình", "biện chứng", "triết học là", "hạt nhân", "bức tranh chung", "thế giới quan", "phương pháp luận"],
    2: ["định nghĩa lênin", "định nghĩa lenin", "thực tại khách quan", "không lệ thuộc vào cảm giác", "chép lại", "chụp lại", "hình ảnh chủ quan", "bộ óc người", "bộ óc con người", "phản ánh năng động", "sáng tạo", "nguồn gốc ý thức", "nguồn gốc tự nhiên", "nguồn gốc xã hội", "lao động", "ngôn ngữ", "vật chất quyết định", "ý thức tác động", "độc lập tương đối", "kết cấu của ý thức", "bản chất của ý thức"],
    3: ["nguyên lý", "liên hệ phổ biến", "ràng buộc", "chuyển hóa", "vận động đi lên", "hình xoáy ốc", "kế thừa", "từ thấp đến cao", "nguyên tắc toàn diện", "nguyên tắc phát triển", "lịch sử cụ thể", "lịch sử - cụ thể", "tính khách quan", "tính phổ biến", "tính đa dạng", "quan điểm toàn diện", "quan điểm phát triển"],
    4: ["lượng", "chất", "độ", "điểm nút", "bước nhảy", "tích lũy", "mâu thuẫn", "động lực phát triển", "mặt đối lập", "thống nhất", "đấu tranh", "phủ định", "khuynh hướng phát triển", "lặp lại", "cái mới", "cái cũ"],
    5: ["cái riêng", "cái chung", "nguyên nhân", "kết quả", "tất nhiên", "ngẫu nhiên", "nội dung", "hình thức", "bản chất", "hiện tượng", "khả năng", "hiện thực", "phạm trù"],
    6: ["thực tiễn", "nhận thức", "chân lý", "cảm tính", "lý tính", "cảm giác", "tri giác", "biểu tượng", "khái niệm", "phán đoán", "suy luận", "trực quan sinh động", "tư duy trừu tượng"],
    7: ["duy vật lịch sử", "hình thái kinh tế", "sản xuất vật chất", "tái sản xuất", "phương thức sản xuất", "lực lượng sản xuất", "quan hệ sản xuất", "quan hệ sở hữu", "công cụ lao động", "tư liệu sản xuất", "cơ sở hạ tầng", "kiến trúc thượng tầng", "tồn tại xã hội", "ý thức xã hội", "tự nhiên", "xã hội"],
    8: ["giai cấp", "dân tộc", "nhà nước", "con người", "chiếm đoạt", "tư hữu", "đấu tranh", "công cụ thống trị", "chuyên chính", "cách mạng xã hội", "quần chúng", "lãnh tụ", "vĩ nhân"]
}

# 2. LOAD QUESTIONS
questions_by_chapter = {}
chapter_files = ['chuong_1.json', 'chuong_2.json', 'chuong_3.json']
chapter_map = {'chuong_1.json': '1', 'chuong_2.json': '2', 'chuong_3.json': '3'}

all_questions = []

print("Loading questions...")
for f in chapter_files:
    path = os.path.join(exam_dir, f)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            ch_id = chapter_map[f]
            for q in data['questions']:
                q['chapter_id'] = ch_id
                all_questions.append(q)

print(f"Total questions loaded: {len(all_questions)}")

# 3. CLASSIFY QUESTIONS
topic_distribution = {i: {"1": [], "2": [], "3": []} for i in range(1, 9)}

def normalize(text):
    if not text: return ""
    return text.lower()

assigned_count = 0

for q in all_questions:
    # Combine text for matching
    text = normalize(q['question']) + " " + normalize(q.get('explain', '')) + " " + normalize(" ".join([o['content'] for o in q.get('options', [])]))
    
    best_topic = None
    max_score = 0
    
    # Priority rules based on Chapter
    chapter_bias = {
        '1': [1, 2],
        '2': [2, 3, 4, 5, 6],
        '3': [7, 8]
    }
    
    possible_topics = chapter_bias.get(q['chapter_id'], range(1, 9))
    
    for t_id in possible_topics:
        score = 0
        keywords = topic_keywords[t_id]
        for kw in keywords:
            if kw in text:
                score += 1
                
        # Boosters
        if t_id == 2 and q['chapter_id'] == '2' and ("vật chất" in text or "ý thức" in text):
             score += 2
        
        if score > max_score:
            max_score = score
            best_topic = t_id
            
    # Fallback logic if no keywords matched
    if max_score == 0:
        if q['chapter_id'] == '1': 
            best_topic = 1
        elif q['chapter_id'] == '2': 
            best_topic = 2
        elif q['chapter_id'] == '3': 
            best_topic = 7
        
        if best_topic is None: 
            best_topic = 1 
        
    topic_distribution[best_topic][q['chapter_id']].append(q['id'])
    assigned_count += 1

print(f"Total classified: {assigned_count}")

# 4. LOAD AND UPDATE STUDY DATA TOPICS
print("Updating study_data.json topics...")
with open(study_data_file, 'r', encoding='utf-8') as f:
    study_data = json.load(f)

# Update Topic-level questions
for topic in study_data:
    t_id = topic['id']
    if t_id in topic_distribution:
        topic['questionIds'] = topic_distribution[t_id]
        count = sum(len(x) for x in topic['questionIds'].values())
        print(f"  Topic {t_id}: {count} questions")

# 5. DISTRIBUTE TO VIDEOS (Within Each Topic)
print("Distributing to videos...")

# Helper to find text
questions_map = {}
for q in all_questions:
    key = f"{q['chapter_id']}-{q['id']}"
    questions_map[key] = normalize(q['question']) + " " + normalize(q.get('explain', '')) + " " + normalize(" ".join([o['content'] for o in q.get('options', [])]))

for topic in study_data:
    topic_id = topic['id']
    videos = topic.get('videos', [])
    if not videos: continue
    
    # Get all questions for this topic
    topic_q_keys = []
    for cid, qids in topic.get('questionIds', {}).items():
        for qid in qids:
            topic_q_keys.append({'cid': cid, 'qid': qid, 'text': questions_map.get(f"{cid}-{qid}", "")})

    if not topic_q_keys:
        for vid in videos: vid['questionIds'] = {}
        continue

    # If single video, take all
    if len(videos) == 1:
        video = videos[0]
        v_map = {}
        for item in topic_q_keys:
            if item['cid'] not in v_map: v_map[item['cid']] = []
            v_map[item['cid']].append(item['qid'])
        video['questionIds'] = v_map
        continue

    # Multiple videos: Keyword match
    video_matchers = []
    for vid in videos:
        # Create keywords from title + desc
        kw_text = normalize(vid['title']) + " " + normalize(vid.get('description', ''))
        
        # Add manual context keywords
        if "nguyên lý" in kw_text: kw_text += " liên hệ phát triển toàn diện lịch sử"
        if "cặp phạm trù" in kw_text: kw_text += " riêng chung nhân quả tất nhiên nội dung bản chất khả năng"
        if "quy luật" in kw_text: kw_text += " lượng chất mâu thuẫn phủ định"
        
        video_matchers.append({
            'video': vid,
            'keywords': kw_text.split(),
            'assigned': []
        })
        
    # Assign
    for item in topic_q_keys:
        best_v_idx = -1
        max_v_score = 0
        
        for idx, matcher in enumerate(video_matchers):
            score = 0
            for kw in matcher['keywords']:
                if kw in item['text'] and len(kw) > 2:
                    score += 1
            if score > max_v_score:
                max_v_score = score
                best_v_idx = idx
        
        # Fallback to first video matches
        if best_v_idx == -1: best_v_idx = 0
        
        video_matchers[best_v_idx]['assigned'].append(item)

    # Convert back to questionIds format
    for matcher in video_matchers:
        assigned = matcher['assigned']
        v_map = {}
        for x in assigned:
            if x['cid'] not in v_map: v_map[x['cid']] = []
            v_map[x['cid']].append(x['qid'])
        matcher['video']['questionIds'] = v_map

# 6. SAVE
with open(study_data_file, 'w', encoding='utf-8') as f:
    json.dump(study_data, f, indent=4, ensure_ascii=False)

print("Done. Saved study_data.json")
