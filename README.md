# STDOUT

Personal feed: notes, posts, projects, links. Built with Astro, deployed to GitHub Pages on every push to `main`.

## Add an entry

Create `src/content/entries/<slug>.md`:

```yaml
---
title: "My note"        # optional for type: post
type: note              # project | section | note | post | link
date: 2026-11-15
tags: [astro]
url: https://...        # required for link
repo: https://github.com/...  # optional, for project
description: "Shown on the card (if no cover) and in RSS"
cover: /images/my-note.webp   # optional, file in public/images/, replaces the description on the card
topic: core             # optional, groups a section and its pages at /topic/<topic>
draft: false            # true = visible only in `npm run dev`
---
```

A `project` holds sections: a `section` names it with `project: <project entry id>`.
A `section` is the intro of its `topic`; notes with the same `topic` are its lessons, ordered by date.

Then `git push`. A broken frontmatter fails the build, so it never reaches the site.

## Commands

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
```

Covers are AI-generated images, stored as `.webp` in `public/images/`.
A redrawn cover gets a new file name, since browsers cache the old one.
