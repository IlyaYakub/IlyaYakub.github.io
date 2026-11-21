---
title: "Window"
type: note
topic: core
date: 2026-11-21T13:00:00
tags: [cpp, nexora, glfw]
cover: /images/core-window-ai2.webp
description: "Open a window, keep it alive and turn a key press into an engine event. GLFW is hidden behind interfaces."
---

The engine knows only two interfaces: `IWindow` (one window) and `IWindowManager` (all windows). GLFW sits behind them, in the `GLFWWindow` and `GLFWWindowManager` classes.

## Example

This is how `Engine` opens the main window and runs the loop:

```cpp
const WindowSettings settings{
    .title  = "Nexora",
    .width  = 1600,
    .height = 900,
};
const auto mainWindowId = m_windowManager->createWindow(settings);

while (!m_windowManager->areAllWindowsClosed())
{
    m_windowManager->update();
}
```

Click the close button, the window closes, the loop ends.

## createWindow

The manager keeps its windows in a "number → window" map:

```cpp
std::unordered_map<WindowId, std::shared_ptr<IWindow>> m_windows;
```

`createWindow` takes the next number, creates a `GLFWWindow`, puts it in the map and tells everyone through `windowCreatedEvent` that a new window exists. Only the number, a `WindowId`, is handed out. The window itself can be asked for by number: `getWindowById(id)`.

## update

One call per frame, three steps:

```cpp
void GLFWWindowManager::update()
{
    glfwPollEvents();
    removeClosedWindows();
    waitWhileAllWindowsMinimized();
}
```

1. Take everything that happened from the system: keys, mouse, the close button.
2. Drop the closed windows. Once the map is empty, `areAllWindowsClosed()` returns `true`.
3. If every window is minimized, sleep in `glfwWaitEvents()` until something happens. A minimized engine doesn't load the CPU.

## A key press

You press `W`. GLFW calls our lambda, and it turns that into an engine event:

```cpp
glfwSetKeyCallback(m_window, [](GLFWwindow* window, int32 key, int32, int32 action, int32)
{
    auto* self = static_cast<GLFWWindow*>(glfwGetWindowUserPointer(window));
    const KeyEventData data{.key = GLFWKeyMapper::toKey(key), .action = GLFWKeyMapper::toAction(action)};
    self->m_windowEvent.invoke({.windowId = self->m_id, .data = data});
});
```

- GLFW calls a plain function and knows nothing about our object. So when the window is created, we give GLFW the `this` pointer (`glfwSetWindowUserPointer`) and take it back in the lambda.
- `GLFWKeyMapper` turns `GLFW_KEY_W` into our `Key::W`. From here on the engine sees only its own types.
- `m_windowEvent.invoke(...)` hands the event to everyone subscribed to this window. How events work is on the [Event](/e/core-event) page.

Mouse, scroll wheel, resizing and closing the window work exactly the same way.
