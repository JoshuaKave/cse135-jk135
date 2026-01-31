#!/usr/bin/python3

import os

print("Content-Type: text/html\n\n")

for name, value in os.environ.items():
    print(f"\"{name}\": \"{value}\"")
    print("\n")