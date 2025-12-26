import json

file_path = 'exam/chuong_2.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("JSON is valid.")
except json.JSONDecodeError as e:
    print(f"JSON Decode Error: {e}")
    # Print context around the error
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        error_line = e.lineno - 1
        start = max(0, error_line - 5)
        end = min(len(lines), error_line + 5)
        print("Context:")
        for i in range(start, end):
            prefix = ">>" if i == error_line else "  "
            print(f"{prefix} {i+1}: {lines[i].strip()}")
