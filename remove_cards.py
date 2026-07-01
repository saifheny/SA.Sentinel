import re
import os

def remove_cards(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    # Find and remove 'تغيير اسم العرض' card
    match1 = re.search(r'<div\s+class="q-card"[^>]*>[\s\S]*?<h3[^>]*>\s*تغيير اسم العرض\s*</h3>[\s\S]*?</button>\s*</div>', html)
    if match1:
        html = html.replace(match1.group(0), '')
        print('Removed Edit Name Card from', filepath)

    # Find and remove 'اخرج من الحساب' card
    match2 = re.search(r'<div\s+class="q-card"[^>]*>[\s\S]*?<h3[^>]*>\s*اخرج من الحساب\s*</h3>[\s\S]*?</button>\s*</div>', html)
    if match2:
        html = html.replace(match2.group(0), '')
        print('Removed Logout Card from', filepath)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

remove_cards(r'C:\Users\hp zbook\Desktop\m\teacher.html')
remove_cards(r'C:\Users\hp zbook\Desktop\SA.E\teacher.html')
print('Done')
