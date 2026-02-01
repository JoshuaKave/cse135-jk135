#!/usr/bin/python3
import os
import json
from datetime import datetime
from html import escape

print("Content-Type: application/json; charset=UTF-8")
print()

remote_addr = os.environ.get("REMOTE_ADDR", "Unknown")
generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

data = {
    "message": "Hello, this is Josh, and welcome to my Python World!",
    "description": "This is an example of a Python generated page.",
    "language": "Python",
    "generated_at": generated_at,
    "your_ip": escape(remote_addr),
}

print(json.dumps(data))