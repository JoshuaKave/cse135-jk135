#!/usr/bin/python3
import os
import sys
import json
from urllib.parse import parse_qs
from html import escape
from datetime import datetime

method = os.environ.get('REQUEST_METHOD', 'GET')
protocol = os.environ.get('SERVER_PROTOCOL', 'HTTP/1.1')
content_type = os.environ.get('CONTENT_TYPE', 'Not needed')
query_string = os.environ.get('QUERY_STRING', '')
hostname = os.environ.get('SERVER_NAME', 'Unknown')
user_agent = os.environ.get('HTTP_USER_AGENT', 'Unknown')
remote_addr = os.environ.get('REMOTE_ADDR', 'Unknown')
timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

body = ''
content_length = int(os.environ.get('CONTENT_LENGTH', 0))
if content_length > 0:
    body = sys.stdin.read(content_length)

intended_method = method
if method == 'GET':
    params = parse_qs(query_string)
    if '_method' in params:
        intended_method = params['_method'][0]
else:
    if 'application/json' in content_type:
        try:
            json_data = json.loads(body)
            if '_method' in json_data:
                intended_method = json_data['_method']
        except:
            pass
    else:
        params = parse_qs(body)
        if '_method' in params:
            intended_method = params['_method'][0]

print("Content-Type: text/html; charset=UTF-8")
print()

print("<!DOCTYPE html>")
print('<html lang="en">')
print("<head>")
print('  <meta charset="UTF-8">')
print("  <title>Python Echo</title>")
print('  <link rel="stylesheet" href="../styles.css">')
print("  <style>")
print("    pre { background-color: #f5f5f5; padding: 1rem; border-radius: 0.25rem; overflow-x: auto; }")
print("  </style>")
print("</head>")
print("<body>")
print("<section>")
print("  <h1>Python Echo Response</h1>")
print("  <h2>Request Information</h2>")
print(f"  <p><strong>HTTP Protocol:</strong> {escape(protocol)}</p>")
print(f"  <p><strong>HTTP Method:</strong> {escape(intended_method)}</p>")
print(f"  <p><strong>Actual HTTP Method:</strong> {escape(method)}</p>")
print(f"  <p><strong>Content-Type:</strong> {escape(content_type)}</p>")
print(f"  <p><strong>Hostname:</strong> {escape(hostname)}</p>")
print(f"  <p><strong>Date/Time:</strong> {escape(timestamp)}</p>")
print(f"  <p><strong>User-Agent:</strong> {escape(user_agent)}</p>")
print(f"  <p><strong>Client IP:</strong> {escape(remote_addr)}</p>")

if method == 'GET':
    print("  <h2>Query Parameters</h2>")
    if query_string:
        params = parse_qs(query_string)
        print("  <ul>")
        for key, values in params.items():
            if key not in ['_method', '_encoding']:
                for value in values:
                    print(f"    <li><strong>{escape(key)}:</strong> {escape(value)}</li>")
        print("  </ul>")
    else:
        print("  <p>No query parameters received.</p>")
else:
    # Handle POST, PUT, DELETE
    if content_length > 0:
        if 'application/json' in content_type:
            print("  <h2>JSON Body</h2>")
            try:
                data = json.loads(body)
                formatted_json = json.dumps(data, indent=2, ensure_ascii=False)
                print(f"  <pre>{escape(formatted_json)}</pre>")
            except json.JSONDecodeError:
                print("  <p>Invalid JSON received.</p>")
        else:
            print("  <h2>Form Data</h2>")
            params = parse_qs(body)
            if params:
                print("  <ul>")
                for key, values in params.items():
                    if key not in ['_method', '_encoding']:
                        for value in values:
                            print(f"    <li><strong>{escape(key)}:</strong> {escape(value)}</li>")
                print("  </ul>")
            else:
                print("  <p>No form data received.</p>")
    else:
        print("  <p>No data received.</p>")

print('  <p><a href="/forms/echo_form.html">Back to Form</a></p>')
print("</section>")
print("</body>")
print("</html>")