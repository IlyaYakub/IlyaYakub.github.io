---
title: "Nexora Core"
type: section
project: nexora
topic: core
date: 2026-11-21T09:00:00
tags: [cpp, nexora]
repo: https://github.com/IlyaYakub/Nexora
cover: /images/core-section-ai2.webp
description: "Five small parts the Nexora engine stands on: files, time, logging, windows and events."
---

Before the engine can draw anything, it needs five simple things. That's **Core**.

The whole engine runs in one loop:

```cpp
while (!m_windowManager->areAllWindowsClosed())
{
    m_timer->tick();
    m_frameStatistics->update();
    m_windowManager->update();
    m_renderer->render();
}
```

While at least one window is open: measure the frame time, update the windows (keyboard, mouse), draw a frame. Over and over.

| Part | What it does | In one line |
| --- | --- | --- |
| [File](/e/core-file) | Reads and writes files | `File::readText("a.txt")` |
| [Timer](/e/core-timer) | Measures how much time has passed | `timer.deltaSeconds()` |
| [Log](/e/core-log) | Prints messages to the console and to a file | `NX_LOG(LogFile, Error, "...")` |
| [Window](/e/core-window) | Creates windows and catches input | `windowManager.createWindow(settings)` |
| [Event](/e/core-event) | Tells every subscriber that something happened | `event.invoke(id)` |

Each lesson takes one part apart on one short example.
