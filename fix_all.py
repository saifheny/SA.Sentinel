import re, os

# The og:image (main sharing image) to use as favicon
og_image = "https://i.postimg.cc/kDrzDHGN/image-(16).jpg"

# New registration page icon
reg_icon = "https://i.postimg.cc/HsqVXwsQ/d25a23c709da03ab475f4abeed2adaab.png"

# 1. Replace ALL favicon SVGs with the og:image in all HTML files
html_files = ['index.html', 'student.html', 'teacher.html', 'exam.html', 'about.html', 'policy.html', 'privacy.html', 'terms.html']

favicon_link = f'<link rel="icon" type="image/png" href="{og_image}" />'

for fname in html_files:
    if not os.path.exists(fname):
        continue
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace favicon link (SVG data URI pattern)
    content = re.sub(
        r'<link\s*\n?\s*rel="icon"\s*\n?\s*type="image/svg\+xml"\s*\n?\s*href="data:image/svg\+xml[^"]*"\s*\n?\s*/?>',
        favicon_link,
        content
    )
    
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Fixed favicon in {fname}')

# 2. Replace registration icon in index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the current auth-logo image
content = content.replace(
    'src="https://i.postimg.cc/Kv1wMLRK/6a2c85258bea1252fd907d4e3eb3a7d1.png"',
    f'src="{reg_icon}"'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed registration icon')

# 3. Protect ALL images globally via CSS (already have .no-copy-img class)
# Add a global rule to base.css for all img tags
with open('css/base.css', 'r', encoding='utf-8') as f:
    css = f.read()

if 'img {' not in css or 'pointer-events' not in css.split('img {')[1][:200] if 'img {' in css else True:
    global_img_protection = '''
/* Protect ALL images from copying */
img {
  -webkit-user-drag: none !important;
  user-select: none !important;
  -moz-user-select: none !important;
  -webkit-user-select: none !important;
  -ms-user-select: none !important;
  -webkit-touch-callout: none !important;
}
'''
    css += global_img_protection
    with open('css/base.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print('Added global image protection CSS')

# Also add oncontextmenu to body in all HTML files to prevent right-click on images
for fname in html_files:
    if not os.path.exists(fname):
        continue
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add oncontextmenu handler to body if not already there
    if 'oncontextmenu' not in content.split('<body')[1][:100] if '<body' in content else True:
        content = content.replace('<body>', '<body oncontextmenu="if(event.target.tagName===\'IMG\')return false;">')
        content = content.replace('<body ', '<body oncontextmenu="if(event.target.tagName===\'IMG\')return false;" ')
    
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)

print('Added right-click protection to all pages')
print('Done!')
