---
title: "Nexora #8: Engine"
type: note
topic: nexora
date: 2026-11-15T17:00:00
tags: [cpp, cmake, variant, architecture]
cover: /images/nexora-engine-ignition.svg
description: "One Engine class owns the managers and the loop. Events go through std::visit, and CMake writes the version."
---

So far `main.cpp` wired everything by hand. This commit adds the `Engine` class: it owns the modules, creates the main window, listens to it and runs the loop.

## The idea: main() knows only Engine

```cpp
int main()
{
    Engine engine;
    engine.run();
    return 0;
}
```

The rest is inside `Engine`:

| Part | Where |
| --- | --- |
| Window manager | `std::unique_ptr<IWindowManager>`, created in the constructor |
| Main window | created in the constructor, 1600×900, title with the version |
| Input | `onWindowEvent`, subscribed to the window's event |
| Loop | `run()`: `update()` until all windows are closed |

The header only forward-declares `IWindowManager` and `InputEvent`, so including `Engine.h` doesn't pull in the window code.

## Intro to std::visit + Overloaded

`std::visit(visitor, variant)` calls the visitor with whatever the variant holds. The visitor must accept **every** alternative, otherwise it doesn't compile. That way a new kind of input can't be silently ignored.

`Overloaded` is a known C++17 trick that merges several lambdas into one object with several `operator()`:

```cpp
template <typename... Visitors>
struct Overloaded : Visitors...
{
    using Visitors::operator()...;
};
```

Usage, one lambda per kind of event:

```cpp
std::visit(
    Overloaded{
        [](const KeyEventData& data) { NX_LOG(LogEngine, Display, "Key: key={}", std::to_underlying(data.key)); },
        [](const WindowResizeEventData& data) { NX_LOG(LogEngine, Display, "Resize: {}x{}", data.width, data.height); },
        // ... one lambda for each of the six alternatives
    },
    event.data);
```

`std::to_underlying` (C++23) turns an `enum class` into its number for printing.

## Key parts

**Subscribing a member function** uses the `Event::add` overload from post #3:

```cpp
window->windowEvent().add(this, &Engine::onWindowEvent);
```

**Version from CMake**: `configure_file` turns a template into a real header at configure time:

```cpp
// EngineConfig.h.in
constexpr std::string_view c_engineVersion = "@PROJECT_VERSION@";
```

```cmake
configure_file(Source/Core/EngineConfig.h.in ${CMAKE_CURRENT_BINARY_DIR}/Generated/Core/EngineConfig.h)
```

The version lives in one place, `project(NexoraEngine VERSION 0.1.0)`, and shows up in the log and the window title.

**Formatting long lambdas**: clang-format would join lines, so a trailing `//` on each line of a lambda keeps one statement per line. The rule is in `CLAUDE.md`, and `.clang-format` aligns those comments in one column.

**Key mapper tests removed**: they were the only reason the test runner linked GLFW. Tests now work with engine types only.

## Checklist

Using:

- `std::visit` + `Overloaded`, `std::to_underlying`
- `configure_file` for generated headers
- forward declarations in headers

Done:

- [x] `Engine` with `run()` and `onWindowEvent()`
- [x] `main.cpp` reduced to two lines
- [x] Version generated from CMake into `EngineConfig.h`
- [x] Every input event logged through `std::visit`
- [x] Test runner no longer links GLFW

Next: the timer.
