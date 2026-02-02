#!/usr/bin/env python3
import os, sys
from urllib.parse import parse_qs
from http.cookies import SimpleCookie

length = int(os.environ.get("CONTENT_LENGTH", "0") or "0")
body = sys.stdin.read(length) if length > 0 else ""

params = parse_qs(body, keep_blank_values=True)

def first(name: str) -> str:
    return (params.get(name, [""])[0] or "").strip()

color = first("favorite_color")
food  = first("favorite_food")

cookie = SimpleCookie()
cookie["favorite_color"] = color
cookie["favorite_color"]["path"] = "/"
cookie["favorite_food"] = food
cookie["favorite_food"]["path"] = "/"

print("Status: 302 Found")
print("Location: /cgi-bin/state-python-view.py")

for line in cookie.output().splitlines():
    print(line)

print()
