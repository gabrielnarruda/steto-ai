
import os

file_path = r'/agents/readme.md'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        print(f"Content length: {len(content)}")
        print(content[:500])
except Exception as e:
    print(f"Error: {e}")
