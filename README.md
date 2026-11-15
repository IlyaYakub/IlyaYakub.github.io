# STDOUT

Personal feed: notes, posts, projects, links. Built with Astro, deployed to GitHub Pages on every push to `main`.

## Add an entry

Create `src/content/entries/<slug>.md`:

```yaml
---
title: "My note"        # optional for type: post
type: note              # note | post | project | link
date: 2026-11-15
tags: [astro]
url: https://...        # required for link
repo: https://github.com/...  # optional, for project
description: "Shown on the card (if no cover) and in RSS"
cover: /images/my-note.svg    # optional, file in public/images/, replaces the description on the card
topic: nexora           # optional, filter at /topic/<topic>
draft: false            # true = visible only in `npm run dev`
---
```

Then `git push`. A broken frontmatter fails the build, so it never reaches the site.

## Commands

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
```
