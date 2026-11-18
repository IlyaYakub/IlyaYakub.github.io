---
title: "Nexora #1: Engine core"
type: note
topic: nexora
date: 2026-11-18T10:00:00
tags: [cpp, architecture, glfw, spdlog]
cover: /images/nexora-engine-core-gears.svg
description: "Log, events and windows: the three small modules everything else in the engine stands on, and how they fit together."
---

Before the engine can draw anything, it needs three things: a way to **report** what happens, a way for modules to **tell each other** about it, and a **window** to draw into. That's the core.

| Module | What it does |
| --- | --- |
| Log | Prints messages by module and importance |
| Event | Lets one module notify many others without knowing them |
| Window | Opens windows and turns input into events |

## Log

Every message has a **category** (which module) and a **verbosity** (how important), like `UE_LOG` in Unreal:

```cpp
DEFINE_LOG_CATEGORY_STATIC(LogEngine);

NX_LOG(LogEngine, Display, "Nexora {}", c_engineVersion);
```

- spdlog does the actual printing; it stays hidden in `Log.cpp`.
- `Warning`, `Error` and `Fatal` add the file and line of the call.
- `Fatal` aborts. The engine has no exceptions: if it can't go on, it says why and stops.

## Event

An event is a list of listeners. Anyone can `add` one; when something happens, `invoke` calls them all in order:

```cpp
Event<WindowId> windowCreatedEvent;

auto handle = windowCreatedEvent.add(this, &Renderer::onWindowCreated);
windowCreatedEvent.invoke(id);
windowCreatedEvent.remove(handle);
```

This is how modules stay apart: the window doesn't know the renderer exists, it just fires an event.

## Window

The engine only sees two interfaces, `IWindow` and `IWindowManager`. GLFW is behind them, in `final` classes.

- The **manager** owns all windows, hands out a `WindowId`, and pumps OS events in `update()`.
- Each **window** has one event, `windowEvent()`, for all input.
- Input is one `InputEvent`: the window id plus a `std::variant` of key, mouse button, mouse move, scroll, resize or close.

A listener picks the cases it cares about with `std::visit`:

```cpp
std::visit(
    Overloaded{
        [](const KeyEventData& data) { /* key pressed */ },
        [](const WindowResizeEventData& data) { /* new size */ },
        [](const auto&) {},
    },
    event.data);
```

## How it fits together

`Engine` owns the modules and runs the loop. `main()` knows only `Engine`:

```cpp
void Engine::run()
{
    while (!m_windowManager->areAllWindowsClosed())
    {
        m_timer->tick();
        m_windowManager->update();
        m_renderer->render();
    }
}
```

One frame: the timer measures delta time, the window manager pumps input (which fires events), and the renderer draws. Everything that comes next, from the graphics API up, plugs into this loop.
