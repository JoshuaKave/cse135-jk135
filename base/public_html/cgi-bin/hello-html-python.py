#!/usr/bin/python3
import cgi
import os
from datetime import datetime


print("Content-Type: text/html; charset=UTF-8")
print()

remote_addr = os.environ.get("REMOTE_ADDR", "Unknown")
generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

print("<!DOCTYPE html>")
print('<html lang="en">')
print("<head>")
print('  <meta charset="UTF-8">')
print("  <title>PHP Hello</title>")
print("</head>")
print("<body>")
print("  <h1>Hello, this is Josh, and welcome to my Python World!</h1>")
print("  <p>This is an example of a Python generated page.</p>")
print("  <p><strong>Language:</strong> Python</p>")
print(f"  <p><strong>Generated at:</strong> {generated_at}</p>")
print(f"  <p><strong>Your IP:</strong> {cgi.escape(remote_addr)}</p>")
print("</body>")
print("</html>")