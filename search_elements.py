import re

with open(r'C:\Users\hp zbook\Desktop\m\teacher.html', 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.finditer(r'<button[^>]*>.*?أنشئ أول امتحان لك الآن.*?</button>', content, re.DOTALL)
for m in matches:
    print('Button found:', m.group(0))

m2 = re.search(r'<div[^>]*id="warn-info-popup"[^>]*>', content)
if m2:
    print('Popup start:', m2.group(0))

print('Edit name card index:', content.find('تغيير اسم العرض'))
print('Logout card index:', content.find('اخرج من الحساب'))
