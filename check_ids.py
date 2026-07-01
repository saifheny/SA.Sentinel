import re

with open(r'C:\Users\hp zbook\Desktop\m\js\teacher.js', 'r', encoding='utf-8') as f:
    js = f.read()

with open(r'C:\Users\hp zbook\Desktop\m\teacher.html', 'r', encoding='utf-8') as f:
    html = f.read()

js_ids = re.findall(r'getElementById\([\'"]([^\'"]+)[\'"]\)', js)
missing = set()
for jid in set(js_ids):
    if f'id="{jid}"' not in html and f"id='{jid}'" not in html:
        missing.add(jid)

print("Missing IDs:", missing)
