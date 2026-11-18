---
title: "Nexora #1: Engine core"
type: note
topic: nexora
date: 2026-11-18T10:00:00
tags: [cpp, architecture, glfw, spdlog]
cover: /images/nexora-engine-core-gears.svg
description: "Log, events, windows and time: the small modules everything else in the engine stands on, and how they fit together."
---

Before the engine can draw anything, it needs a way to **report** what happens, a way for modules to **tell each other** about it, a **window** to draw into, and a **clock**. That's the core. `Engine` owns all of it and runs one loop:

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

`main()` knows only `Engine`. Open a section to see how each part works.

<details>
<summary>Log</summary>

Every message has a **category** (which module) and a **verbosity** (how important), like `UE_LOG` in Unreal:

```cpp
DEFINE_LOG_CATEGORY_STATIC(LogEngine);

NX_LOG(LogEngine, Display, "Nexora {}", c_engineVersion);
```

| Verbosity | When |
| --- | --- |
| `Fatal` | The engine can't go on. Logs and aborts |
| `Error` | Something failed, but the engine keeps running |
| `Warning` | Looks wrong, worth a look |
| `Display` | Normal information, always shown |
| `Log` | Details, e.g. Vulkan validation info |

How it works:

- `NX_LOG` is a macro. It checks at compile time that the first argument is a real `LogCategory`, formats the message with `std::format` and adds `std::source_location`.
- `Warning`, `Error` and `Fatal` print the file and line of the call.
- spdlog does the actual printing. It's hidden behind `Log::Impl` in `Log.cpp`, so no header sees it.
- There are no exceptions in the engine. If something can't be fixed, it's logged as `Fatal`, which stops the program with a clear message.

</details>

<details>
<summary>Event</summary>

An event is a list of listeners. Anyone can `add` one; when something happens, `invoke` calls them all in the order they were added. It's Unreal's multicast delegate, simplified:

```cpp
Event<WindowId> windowCreatedEvent;

auto handle = windowCreatedEvent.add(this, &Renderer::onWindowCreated);
windowCreatedEvent.invoke(id);
windowCreatedEvent.remove(handle);
```

- `add` takes a lambda, or an object and a member function, and returns an `EventHandle`.
- `remove(handle)` unsubscribes.
- The arguments are a template: `Event<WindowId>`, `Event<const InputEvent&>`.

This is how modules stay apart. The window manager doesn't know the renderer exists; it just fires `windowCreatedEvent`, and the renderer, which subscribed to it, creates a viewport for the new window.

</details>

<details>
<summary>Window</summary>

The engine only sees two interfaces, `IWindow` and `IWindowManager`. GLFW is behind them, in `final` classes `GLFWWindow` and `GLFWWindowManager`.

| Part | Role |
| --- | --- |
| `IWindowManager` | Owns all windows, starts and stops GLFW, gives out a `WindowId` |
| `IWindow` | One window: size, `isMinimized()`, native handle, `windowEvent()` |
| `InputEvent` | Window id + a `std::variant` of key, mouse, scroll, resize or close data |
| `GLFWKeyMapper` | Turns GLFW key codes into the engine's `Key` enum |

The manager stores windows in an `unordered_map<WindowId, shared_ptr<IWindow>>`. Callers keep the id, not the window, and ask for it with `getWindowById(id)`.

Each window has **one** event for all its input. GLFW calls a callback, the callback builds an `InputEvent` and invokes the window's event:

![Input goes from the OS through a GLFW callback into InputEvent and out to listeners](/images/nexora-engine-core/event-flow.svg)

A listener picks the cases it cares about with `std::visit`, and ignores the rest:

```cpp
std::visit(
    Overloaded{
        [](const KeyEventData& data) { /* key pressed */ },
        [](const WindowResizeEventData& data) { /* new size */ },
        [](const auto&) {},
    },
    event.data);
```

When a window is closed, `update()` removes it from the map. The loop ends when no windows are left.

</details>

<details>
<summary>Time</summary>

Everything that moves needs to know how much time passed since the last frame. That's **delta time**. Frames aren't equal: one takes 16 ms, the next 33 ms. Moving `speed * deltaSeconds` per frame gives the same speed on every machine.

| Getter | What it is |
| --- | --- |
| `deltaSeconds()` | Time between the last two `tick()` calls |
| `totalSeconds()` | Time since the timer was created |

```cpp
void Timer::tick()
{
    const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
    m_deltaSeconds = std::chrono::duration<float>(now - m_lastTickTime).count();
    m_totalSeconds = std::chrono::duration<float>(now - m_startTime).count();
    m_lastTickTime = now;
}
```

`steady_clock` never jumps back when the system clock changes. The engine calls `tick()` once at the start of every frame.

</details>
