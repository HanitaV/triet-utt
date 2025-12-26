import json
import os
import subprocess
import yt_dlp

DATA_FILE = 'docs/study_data.json'
OUTPUT_DIR = 'docs/assets/videos'

def load_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def download_and_cut(video_id, start_time, end_time, output_name):
    # Ensure output directory exists
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    output_path = os.path.join(OUTPUT_DIR, f"{output_name}.mp4")
    
    # If file exists, skip (or overwrite if force needed)
    if os.path.exists(output_path):
        print(f"File {output_path} already exists. Skipping.")
        return output_path

    # Construct format URL
    ydl_opts = {
        'format': 'best[ext=mp4]',
        'cookiefile': 'cookies.txt'
    }
    
    print(f"Processing {video_id} from {start_time} to {end_time}...")

    # We use ffmpeg to download specific part directly from URL if possible, 
    # but yt-dlp + ffmpeg post-processing is more robust for YouTube.
    # Approach: Get stream URL with yt-dlp, feed to ffmpeg.
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_id, download=False)
        url = info['url']
        
        # ffmpeg command to cut
        # -ss before -i is fast seek
        cmd = [
            'ffmpeg',
            '-ss', str(start_time),
            '-i', url,
            '-to', str(end_time - start_time), # duration if -ss is before -i
            '-c', 'copy', # Copy stream without re-encoding (fast)
            output_path
        ]
        
        # Warning: -c copy might be inaccurate for cutting. 
        # For precision, remove '-c copy' but it will be slower (re-encoding).
        # Let's try re-encoding for precision since these are short clips usually.
        # Actually start with copy for speed, if user complains about precision we switch.
        # Wait, cutting directly from stream often requires re-encoding or accurate keyframes.
        # Let's do re-encoding (remove -c copy) for safety and compatibility.
        
        cmd = [
            'ffmpeg',
            '-ss', str(start_time),
            '-i', url,
            '-t', str(end_time - start_time),
            '-c:v', 'libx264', '-c:a', 'aac',
            output_path
        ]
        
        # If headers are needed (sometimes yes for YouTube URLs)
        # yt-dlp usually handles this better by downloading fully first.
        # Downloading full video is safer but slower. 
        # Let's try the yt-dlp download-sections feature!
        
        # NEW STRATEGY: Use yt-dlp native download sections
        # This is much cleaner.
    
    download_opts = {
        'format': 'best[ext=mp4]',
        'outtmpl': output_path,
        'download_ranges': yt_dlp.utils.download_range_func(None, [(start_time, end_time)]),
        'force_keyframes_at_cuts': True,
        'cookiesfrombrowser': ('chrome',)
    }
    
    with yt_dlp.YoutubeDL(download_opts) as ydl:
        ydl.download([video_id])
        
    return output_path

def main():
    data = load_data()
    modified = False

    for section in data:
        for topic in section['topics']:
            # Check if processing is needed
            if 'startTime' in topic and 'endTime' in topic and 'localPath' not in topic:
                video_id = topic['videoId']
                start = topic['startTime']
                end = topic['endTime']
                # Create filename from title (sanitized)
                safe_title = "".join([c for c in topic['title'] if c.isalnum() or c in (' ', '-', '_')]).strip().replace(' ', '_')
                output_name = f"{section['chapter']}_{safe_title}"
                
                try:
                    path = download_and_cut(video_id, start, end, output_name)
                    # Update data with relative path
                    topic['localPath'] = path.replace('\\', '/')
                    modified = True
                    print(f"Success: {path}")
                except Exception as e:
                    print(f"Error processing {topic['title']}: {e}")

    if modified:
        save_data(data)
        print("Updated study_data.json")

if __name__ == "__main__":
    main()
