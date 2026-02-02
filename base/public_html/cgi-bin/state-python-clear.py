#!/usr/bin/python3
from http.cookies import SimpleCookie

cookie = SimpleCookie()

cookie["favorite_color"] = ""
cookie["favorite_color"]["path"] = "/"
cookie["favorite_color"]["max-age"] = 0

cookie["favorite_food"] = ""
cookie["favorite_food"]["path"] = "/"
cookie["favorite_food"]["max-age"] = 0

print("Status: 302 Found")
print("Location: /cgi-bin/state-python-view.py")

for morsel in cookie.values():
    print(morsel.OutputString())

print()
