import os
import json
from datetime import datetime
from html import escape

#!/usr/bin/python3

print("Content-Type: application/json; charset=UTF-8")
print()

remote_addr = os.environ.get("REMOTE_ADDR", "Unknown")
generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

data = {
    "message": "Hello, this is Josh, and welcome to my PHP World!",
    "description": "This is an example of a PHP generated page.",
    "language": "PHP",
    "generated_at": generated_at,
    "your_ip": escape(remote_addr),
}

print(json.dumps(data))