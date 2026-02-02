#!/usr/bin/python3
import os
from html import escape
from http.cookies import SimpleCookie

raw = os.environ.get("HTTP_COOKIE", "")
cookie = SimpleCookie()
cookie.load(raw)

color = cookie.get("favorite_color")
food  = cookie.get("favorite_food")

color_val = color.value if color else ""
food_val  = food.value if food else ""

print("Content-Type: text/html; charset=UTF-8")
print()

print(f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>State Demo (Python) - View</title><link rel="stylesheet" href="../styles.css"></head>
<body>
  <h1>State Demo (Python) - View</h1>
""")

if not color_val and not food_val:
    print("<p><em>No state saved yet.</em></p>")
else:
    print(f"<p><strong>Favorite color:</strong> {escape(color_val)}</p>")
    print(f"<p><strong>Favorite food:</strong> {escape(food_val)}</p>")

print("""  <form method="post" action="/cgi-bin/state-python-clear.py">
    <button type="submit">Clear saved state</button>
  </form>

  <p><a href="/cgi-bin/state-python-set.py">Back to set page</a></p>
    <a href="/index.html">Home</a>
</body>
</html>
""")
