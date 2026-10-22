---
tagline: Print whether a shop is open, from a plain weekly hours file
for: Shop owners who keep hours in a text file
problem: A photo of a door sign is not something a phone can check at 8pm
help_wanted: Owners with split shifts, and a reviewer who cares about time zones
run: |
  npm install
  node bin/hours.js
---

# shop-hours

An example HIVE.md for a command line tool. Not a live project.

You keep a text file of weekly hours. The command prints open or closed for the time you give it. It does not call a network and it does not store customers.

There is no one-click deploy target, so this file leaves `deploy` out. That is valid. The field is optional.

What it does today:

- Reads an hours file and prints open or closed

What is next:

- The cases an owner actually hits, such as a holiday or a day with two shifts

How to help:

- Send a real hours file that the tool gets wrong
