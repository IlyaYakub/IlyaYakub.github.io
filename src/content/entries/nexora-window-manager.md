---
title: "Nexora #5: window manager and tests"
type: note
topic: nexora
date: 2026-11-15T14:00:00
tags: [cpp, glfw, architecture, googletest]
cover: /images/nexora-window-manager.svg
description: "One owner for all windows and for GLFW itself: ids, a map, and the main loop."
---

A window can't live on its own: something has to start GLFW, keep the windows, process events and notice when a window closes. That's the window manager.

## The idea: a manager owns the objects

The manager creates the objects, stores them, and hands out an **id**. Callers keep the id, not the object. The engine only sees `IWindowManager`, the same interface + `final` split as the window itself.

```cpp
const std::unique_ptr<IWindowManager> windowManager = std::make_unique<GLFWWindowManager>();
windowManager->createWindow(WindowSettings{});

while (!windowManager->areAllWindowsClosed())
{
    windowManager->update();
}
```

| Method | What it does |
| --- | --- |
| `createWindow(settings)` | Creates a window, returns its `WindowId` |
| `getWindowById(id)` | Returns the window as `std::shared_ptr<IWindow>` |
| `update()` | Polls events, removes closed windows |
| `areAllWindowsClosed()` | `true` when the map is empty, the main loop exits |

## Key parts

**GLFW lifetime** belongs to the manager: `glfwInit()` in the constructor, `glfwTerminate()` in the destructor. The windows are destroyed first:

```cpp
GLFWWindowManager::~GLFWWindowManager()
{
    m_windows.clear();
    glfwTerminate();
}
```

**Strong id**: `WindowId` is a struct, not a bare `uint32`, so it can't be mixed up with a width or a count. A `std::hash` specialization lets it be a map key:

```cpp
struct WindowId
{
    uint32 value{0};
    auto operator<=>(const WindowId&) const = default;
};

template <>
struct std::hash<Nexora::WindowId> { /* hash of value */ };
```

**Storage**: a map from id to the interface. Windows are handed out as `shared_ptr`, never as a raw pointer:

```cpp
std::unordered_map<WindowId, std::shared_ptr<IWindow>> m_windows;
```

**One step, one method**: `update()` reads like a list of steps:

```cpp
void GLFWWindowManager::update()
{
    glfwPollEvents();
    removeClosedWindows();
}
```

`removeClosedWindows()` is a single `std::erase_if` over the map.

## Tests

The tests use a real GLFW window, so they need a desktop to run on. One check per behavior:

```cpp
TEST(WindowTest, ShouldGiveEachWindowUniqueId)
{
    GLFWWindowManager windowManager;

    const WindowId firstId  = windowManager.createWindow(WindowSettings{});
    const WindowId secondId = windowManager.createWindow(WindowSettings{});

    EXPECT_NE(firstId, secondId);
}
```

The second test creates a 640×480 window and checks `width()` and `height()`.

## Checklist

Using:

- `std::unordered_map` with a custom `std::hash`
- `std::shared_ptr` for hand-out, `std::unique_ptr` for ownership
- an interface + `final` implementation, again

Done:

- [x] `IWindowManager` and `GLFWWindowManager`
- [x] `WindowId` as a strong, hashable id
- [x] `glfwInit` / `glfwTerminate` owned by the manager
- [x] Main loop in `main.cpp`: runs until the last window closes
- [x] Two tests: requested size and unique ids

Next: input events.
