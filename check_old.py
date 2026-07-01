import re
with open('old_teacher.html', 'r', encoding='utf-8') as f:
    text = f.read()
print('exam-success-msg in old:', 'exam-success-msg' in text)
print('exam-fail-msg in old:', 'exam-fail-msg' in text)
