#!/usr/bin/python3

import os

print("Content-Type: text/html\n\n")

print(os.environ.get("REQUEST_METHOD"))