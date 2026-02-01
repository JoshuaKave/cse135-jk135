#!/usr/bin/python3
import os
import sys
import json
from urllib.parse import parse_qs
from html import escape

method = os.environ.get('REQUEST_METHOD', 'GET')
protocol = os.environ.get('SERVER_PROTOCOL', 'HTTP/1.1')
content_type = os.environ.get('CONTENT_TYPE', '')
query_string = os.environ.get('QUERY_STRING', '')

print("Content-Type: text/html; charset=UTF-8")
print()

print("<!DOCTYPE html>")
print('<html lang="en">')
print("<head>")
print('  <meta charset="UTF-8">')
print("  <title>Python Echo</title>")
print('  <link rel="stylesheet" href="../styles.css">')
print("</head>")
print("<body>")
print("<section>")
print("  <h1>Python Echo Response</h1>")
print("  <h2>Request Information</h2>")
print(f"  <p><strong>HTTP Protocol:</strong> {escape(protocol)}</p>")
print(f"  <p><strong>HTTP Method:</strong> {escape(method)}</p>")
print(f"  <p><strong>Content-Type:</strong> {escape(content_type)}</p>")

if method == 'GET':
    print("  <h2>Query Parameters</h2>")
    if query_string:
        params = parse_qs(query_string)
        print("  <ul>")
        for key, values in params.items():
            for value in values:
                print(f"    <li><strong>{escape(key)}:</strong> {escape(value)}</li>")
        print("  </ul>")
    else:
        print("  <p>No query parameters received.</p>")
else:
    # Handle POST, PUT, DELETE
    content_length = int(os.environ.get('CONTENT_LENGTH', 0))
    
    if content_length > 0:
        body = sys.stdin.read(content_length)
        
        if 'application/json' in content_type:
            print("  <h2>JSON Body</h2>")
            try:
                data = json.loads(body)
                print("  <ul>")
                for key, value in data.items():
                    print(f"    <li><strong>{escape(key)}:</strong> {escape(str(value))}</li>")
                print("  </ul>")
            except json.JSONDecodeError:
                print("  <p>Invalid JSON received.</p>")
        else:
            print("  <h2>Form Data</h2>")
            params = parse_qs(body)
            if params:
                print("  <ul>")
                for key, values in params.items():
                    for value in values:
                        print(f"    <li><strong>{escape(key)}:</strong> {escape(value)}</li>")
                print("  </ul>")
            else:
                print("  <p>No form data received.</p>")
    else:
        print("  <p>No data received.</p>")

print('  <p><a href="../forms/echo_form.html">Back to Form</a></p>')
print("</section>")
print("</body>")
print("</html>")