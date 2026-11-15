---
title: "Hello, stdout"
type: note
date: 2026-11-15
tags: [meta, astro]
description: "Why this site exists and how it works: markdown files, git push, done."
---

This is a place where I print things: notes, half-formed thoughts, projects and links worth keeping.

## How it works

Every entry is a single Markdown file in `src/content/entries/`. The `type` field decides how it shows up in the feed:

| type      | what it is                         |
| --------- | ---------------------------------- |
| `note`    | a longer write-up, like this one   |
| `post`    | a short thought, shown in full     |
| `project` | something I built                  |
| `link`    | something someone else made        |

```ts
// adding an entry is just writing a file
const entry = { type: 'note', title: 'Hello, stdout' };
console.log(entry);
```

> Write it down, push it, move on.
