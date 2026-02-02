#!/usr/bin/python3
print("Content-Type: text/html; charset=UTF-8")
print()

print("""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>State Demo (Python) - Set</title><link rel="stylesheet" href="../styles.css"></head>
<body>
  <h1>State Demo (Python) - Set</h1>

  <form method="post" action="/cgi-bin/state-python-save.py">
    <label>Favorite color: <input name="favorite_color" required></label><br><br>
    <label>Favorite food: <input name="favorite_food" required></label><br><br>
    <button type="submit">Save</button>
  </form>

  <p><a href="/cgi-bin/state-python-view.py">View saved state</a></p>
    <a href="/index.html">Home</a>
</body>
</html>
""")
