---
title: "Log"
type: note
topic: core
date: 2026-11-21T12:00:00
tags: [cpp, nexora, spdlog]
cover: /images/core-log-ai2.webp
description: "One NX_LOG line, and the message with its category, verbosity, file and line is in the console and in a file."
---

The log works like `UE_LOG` in Unreal: every message has a **category** (which module) and a **verbosity** (how important).

## Example

`File` failed to open a file:

```cpp
DEFINE_LOG_CATEGORY_STATIC(LogFile);

NX_LOG(LogFile, Error, "Failed to open {} for reading", path.string());
```

In the console:

```text
[14:02:07.315] LogFile: Error: Failed to open a.txt for reading (File.cpp:16)
```

Time, category, verbosity, text and, since it's an error, the file and line it came from.

## Verbosity

| Verbosity | When | File and line |
| --- | --- | --- |
| `Fatal` | The engine can't go on: logs and stops the program | yes |
| `Error` | Something broke, but the engine keeps running | yes |
| `Warning` | Looks wrong, worth a look | yes |
| `Display` | Normal information | no |
| `Log` | Details, e.g. from Vulkan validation | no |

## What NX_LOG does

`NX_LOG` is a macro. It takes three steps:

1. Checks at compile time that `LogFile` is a real category. A typo won't compile.
2. Drops messages that are too detailed at compile time (`if constexpr`), so they cost nothing.
3. Builds the text with `std::format` and adds `std::source_location`, which is where the file and line come from.

Then `Log::log` puts the line together and hands it to spdlog. The message goes to two places:

- the console, from `Display` up;
- the file `Saved/Logs/Nexora-2026.11.21-14.02.07.log`, everything.

## Fatal

The engine has no exceptions. When it can't go on (say, the window wasn't created), it logs `Fatal`:

```cpp
NX_LOG(LogWindow, Fatal, "Failed to create window");
```

The log is flushed, the debugger stops on this line, and the program exits. A clear message instead of a crash somewhere unclear.

## Where spdlog hides

spdlog is included only in `Log.cpp`, inside the `Log::Impl` class. The `Log.h` header doesn't know about it, so the rest of the engine doesn't drag a third-party library along.
