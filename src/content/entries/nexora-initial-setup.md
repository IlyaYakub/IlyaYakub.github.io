---
title: "Nexora #1: the initial commit"
type: note
topic: nexora
date: 2026-11-15
tags: [cpp, cmake, setup]
cover: /images/nexora-initial-commit.svg
description: "Project skeleton for a C++ engine: what's in the first commit and why."
---

Nexora is a game engine I'm writing from scratch. The first commit has no engine code. It sets up the project so every later commit is only about code.

## What and why

| Did | Why |
| --- | --- |
| `Engine/Source/`, `Automation/`, `Config/` | Each folder has one job: code, scripts, tool configs. |
| Engine as a library + thin `main.cpp` | Tests link the same library and test the real code. |
| Sources listed by hand, no glob | A new file shows up in the diff and CMake never misses it. |
| `/W4` (later `/WX`) from day one | Strict warnings are free on an empty project and expensive later. |
| `/permissive- /Zc:preprocessor /utf-8` | MSVC behaves like the standard. |
| Force-included `pch.h` | Fast builds, and no `#include "pch.h"` in every file. |
| Conan with pinned versions | The same dependencies on every machine. |
| One `.bat` per action, output in `Build/` | One command to build. Delete `Build/` to get a clean checkout. |
| `.clang-format` + format script | No discussions about formatting. |
| `CLAUDE.md` | Style and architecture rules written down once. |

## Layout

```text
Nexora/
├── Automation/   build, clean, format scripts
├── Config/       conanfile, .clang-format
├── Engine/
│   ├── CMakeLists.txt
│   └── Source/   main.cpp, pch.h, pch.cpp
└── CMakeLists.txt
```

Next commit: the log.
