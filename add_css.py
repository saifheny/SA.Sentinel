
css = '''
.no-copy-img {
  pointer-events: none !important;
  -webkit-user-drag: none !important;
  user-select: none !important;
  -moz-user-select: none !important;
  -webkit-user-select: none !important;
  -ms-user-select: none !important;
  -webkit-touch-callout: none !important; /* iOS Safari */
}
'''
with open('css/base.css', 'a', encoding='utf-8') as f:
    f.write(css)
print('added CSS')

