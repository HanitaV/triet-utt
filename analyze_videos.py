import json
import os
import time
import requests
import yt_dlp
import webvtt
from dotenv import load_dotenv

# Load .env for API KEY
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
DATA_FILE = 'study_data.json'
TRANSCRIPT_DIR = 'assets/transcripts'

def load_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_transcript(video_id):
    if not os.path.exists(TRANSCRIPT_DIR):
        os.makedirs(TRANSCRIPT_DIR)
    
    # Check for manually fetched .txt transcript FIRST
    txt_path = os.path.join(TRANSCRIPT_DIR, f"{video_id}.txt")
    if os.path.exists(txt_path):
        return txt_path

    # Check if we already have the subtitle file
    # yt-dlp naming can be tricky, typically "id.lang.vtt"
    expected_path = os.path.join(TRANSCRIPT_DIR, f"{video_id}.vi.vtt")
    
    if not os.path.exists(expected_path):
        print(f"Downloading transcript for {video_id}...")
        ydl_opts = {
            'skip_download': True,
            'writeautomaticsub': True,
            'writesub': True,
            'sublangs': ['vi'],
            'cookiefile': 'cookies.txt',
            'outtmpl': os.path.join(TRANSCRIPT_DIR, f"{video_id}"),
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
            except Exception as e:
                print(f"Error downloading subs: {e}")
                return None

    # YT-dlp might save as .vtt
    if os.path.exists(expected_path):
        return expected_path

    # Check for manually fetched .txt transcript
    txt_path = os.path.join(TRANSCRIPT_DIR, f"{video_id}.txt")
    if os.path.exists(txt_path):
        return txt_path
    
    # Fallback to look for any .vtt with that id
    for f in os.listdir(TRANSCRIPT_DIR):
        if f.startswith(video_id) and f.endswith(".vtt"):
            return os.path.join(TRANSCRIPT_DIR, f)
            
    return None

def parse_transcript(file_path):
    text_content = []
    
    if file_path.endswith('.txt'):
        # Manual scrape format assumption: "0:00 Text line"
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for line in lines:
                    text_content.append(line.strip())
            return "\n".join(text_content)
        except Exception as e:
            print(f"Error reading TXT: {e}")
            return ""

    try:
        for caption in webvtt.read(file_path):
            start = caption.start_in_seconds
            text = caption.text.replace('\n', ' ')
            text_content.append(f"[{int(start)}s] {text}")
    except Exception as e:
        print(f"Error parsing VTT: {e}")
        return ""
    return "\n".join(text_content)

def ask_gemini(transcript_text, topic_title, topic_theory):
    prompt = f"""
    Bạn là một trợ lý học tập thông minh. Nhiệm vụ của bạn là tìm đoạn video phù hợp nhất cho một chủ đề học tập.
    
    CHỦ ĐỀ: "{topic_title}"
    MÔ TẢ LÝ THUYẾT: "{topic_theory}"
    
    Dưới đây là nội dung phụ đề (transcript) của video kèm thời gian:
    ---
    {transcript_text[:25000]} 
    ---
    (Transcript có thể bị cắt bớt nếu quá dài)

    YÊU CẦU:
    1. Tìm khoảng thời gian (start_time, end_time) mà video nói rõ nhất về chủ đề trên.
    2. Thời gian tính bằng giây (seconds).
    3. Trả về định dạng JSON thuần túy: {{"start": 120, "end": 240, "reason": "Giải thích ngắn gọn"}}.
    4. Nếu không tìm thấy, trả về {{"start": 0, "end": 0, "reason": "Not found"}}.
    5. Đảm bảo clip không quá ngắn (< 30s) và không quá dài (> 5 phút) trừ khi cần thiết.
    """
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }
    
    try:
        response = requests.post(f"{API_URL}?key={API_KEY}", json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()
        text_response = result["candidates"][0]["content"]["parts"][0]["text"]
        # Clean up markdown code blocks if present
        if text_response.startswith("```json"):
            text_response = text_response.replace("```json", "").replace("```", "")
        elif text_response.startswith("```"):
             text_response = text_response.replace("```", "")
             
        parsed = json.loads(text_response.strip())
        
        if isinstance(parsed, list):
            if len(parsed) > 0:
                return parsed[0]
            else:
                return None
        return parsed
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None

def main():
    if not API_KEY:
        print("ERROR: Missing GEMINI_API_KEY in .env")
        return

    data = load_data()
    modified = False
    
    print("--- Starting AI Video Analysis ---")
    
    for section in data:
        for topic in section['topics']:
            # Skip if already has local video or manual timestamps (unless forced, but let's be safe)
            if 'localPath' in topic:
                continue
            if 'startTime' in topic and 'endTime' in topic and topic['endTime'] > 0:
                print(f"Skipping {topic['title']} (already has timestamps)")
                continue
                
            print(f"\nAnalyzing topic: {topic['title']}")
            
            # 1. Get Transcript
            vtt_path = get_transcript(topic['videoId'])
            if not vtt_path:
                print("No transcript found.")
                continue
                
            # 2. Parse
            transcript_text = parse_transcript(vtt_path)
            if not transcript_text:
                print("Empty transcript.")
                continue
                
            # 3. Ask Gemini
            print("Sending to Gemini...")
            result = ask_gemini(transcript_text, topic['title'], topic.get('theory', ''))
            
            if result:
                print(f"Gemini Result: {result}")
                if result.get('start') != result.get('end'):
                    topic['startTime'] = int(result['start'])
                    topic['endTime'] = int(result['end'])
                    topic['ai_reason'] = result.get('reason')
                    modified = True
                    save_data(data)
                    print("Saved progress.")
            
            # Avoid rate limits
            time.sleep(4)

    if modified:
        save_data(data)
        print("\nUpdated study_data.json with new timestamps.")
    else:
        print("\nNo changes made.")

if __name__ == "__main__":
    main()
