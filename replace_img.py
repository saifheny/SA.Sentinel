import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<img.*?class="edu-img".*?>'
replacement = '<img src="https://i.postimg.cc/Kv1wMLRK/6a2c85258bea1252fd907d4e3eb3a7d1.png" alt="Academy" class="edu-img no-copy-img" oncontextmenu="return false;" draggable="false" loading="lazy" />'
content = re.sub(pattern, replacement, content)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

with open('student.html', 'r', encoding='utf-8') as f:
    content2 = f.read()
replacement2 = '<img src="https://i.postimg.cc/HsrRy5V5/c7a6e2a0f7e997872cf3a55bb9275be2.png" alt="Student" class="edu-img no-copy-img" oncontextmenu="return false;" draggable="false" loading="lazy" />'
content2 = re.sub(pattern, replacement2, content2)
with open('student.html', 'w', encoding='utf-8') as f:
    f.write(content2)

print('Replaced images')
