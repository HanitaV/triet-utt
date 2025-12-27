
import re

file_path = r'c:\Users\eleven\triet-utt\assets\triet.md'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

chapters = re.split(r'(CHƯƠNG \d+)', content)

print(f"Total parts: {len(chapters)}")
for i, part in enumerate(chapters):
    if "CHƯƠNG 2" in part:
        print(f"Part {i} contains CHƯƠNG 2")
        print(f"Next part ({i+1}) length: {len(chapters[i+1])}")
        print("First 500 chars of next part:")
        print(chapters[i+1][:500])
        print("-" * 20)
        
        # Check for Question 1 in this content
        lines = chapters[i+1].split('\n')
        # Print first 20 lines
        for j, line in enumerate(lines[:20]):
            print(f"L{j}: {repr(line)}")
        break
