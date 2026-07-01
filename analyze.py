import re

with open(r'C:\Users\hp zbook\Desktop\m\js\teacher.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Look for render or load functions
matches = re.finditer(r'function \w*(load|render|fetch)\w*.*\{', js, re.IGNORECASE)
for m in matches:
    print('Function:', m.group(0))

# Look for innerHTML or appendChild for exams
matches = re.finditer(r'\S+\.innerHTML\s*=.*(?:exam|tr|td|li).*', js, re.IGNORECASE)
for m in matches:
    print('innerHTML:', m.group(0))

