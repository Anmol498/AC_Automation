import re

with open("c:/Users/anmol/OneDrive/Desktop/Live Project/AC_Automation/screen.html", "r", encoding="utf-8") as f:
    html = f.read()

# Extract the body content between <body> and </body>
body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
if body_match:
    body = body_match.group(1)
else:
    body = html

# Convert class to className
body = body.replace('class="', 'className="')

# Self-close elements
body = re.sub(r'<img(.*?)(?<!/)>', r'<img\1/>', body)
body = re.sub(r'<div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>', r'<div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"/>', body)

# the HTML might use `onclick` -> `onClick`
body = body.replace('onclick="', 'onClick={() => ')
temp_body = []
for line in body.splitlines():
    if 'onClick={() =>' in line and '">' in line:
        line = line.replace('">', '}">')
    temp_body.append(line)
body = '\n'.join(temp_body)

# Replace static values with dynamic variables from `currentModel`
# Header Back to catalog -> <Link to="/">
body = body.replace(r'<a className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">', '<Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">')
body = body.replace('</Link>\n', '</Link>\n') # This is roughly manual mapping

with open("c:/Users/anmol/OneDrive/Desktop/Live Project/AC_Automation/client/src/pages/ProductDetailParsed.tsx", "w", encoding="utf-8") as f:
    f.write(body)
