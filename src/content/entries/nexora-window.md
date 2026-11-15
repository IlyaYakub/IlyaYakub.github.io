---
title: "Nexora #4: GLFW window"
type: note
topic: nexora
date: 2026-11-15T13:00:00
tags: [cpp, glfw, architecture]
cover: /images/nexora-window.svg
description: "A window behind an interface: IWindow, a final GLFW implementation, and no OpenGL context."
---

Before anything can be drawn, the engine needs a window. This commit adds one, behind an interface so the rest of the engine never sees GLFW.

## Intro to GLFW

GLFW is a small C library that opens windows and reads input on Windows, Linux and macOS. It doesn't draw anything itself.

- **glfwInit / glfwTerminate**: start and stop the library, once per program
- **window hints**: settings applied to the next window you create
- **GLFWwindow\***: an opaque handle to one window
- **events**: `glfwPollEvents()` processes input and close requests

```cpp
glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
GLFWwindow* window = glfwCreateWindow(1280, 720, "Nexora", nullptr, nullptr);
```

`GLFW_NO_API` turns off the OpenGL context GLFW creates by default. Vulkan doesn't need one, it attaches to the window through a surface.

## Interface + final implementation

The engine works with `IWindow`. `GLFWWindow` is one implementation of it, so GLFW could be swapped out without touching the callers.

```cpp
class IWindow : public NonCopyable
{
public:
    virtual ~IWindow() = default;

    virtual bool shouldClose() const = 0;
    virtual int32 width() const      = 0;
    virtual int32 height() const     = 0;
};

class GLFWWindow final : public IWindow { /* ... */ };
```

`final` tells the reader and the compiler that nothing inherits from it.

## Key parts

**Settings struct** instead of a long parameter list, with defaults:

```cpp
struct WindowSettings
{
    std::string title{"Nexora"};
    int32 width{1280};
    int32 height{720};
};
```

**Forward declaration** keeps GLFW out of the header, so only `GLFWWindow.cpp` includes `<GLFW/glfw3.h>`:

```cpp
struct GLFWwindow;
```

**RAII**: the constructor creates the window, the destructor destroys it. No `init()`, no `shutdown()`:

```cpp
GLFWWindow::~GLFWWindow()
{
    glfwDestroyWindow(m_window);
}
```

**Fatal on failure**: without a window the engine can't continue, so it logs `Fatal`, which aborts:

```cpp
if (!m_window)
{
    NX_LOG(LogWindow, Fatal, "Failed to create window");
}
```

**int32 sizes**: GLFW takes `int`, so the fields are `int32` and no casts are needed.

`glfwInit()` is not here yet. It belongs to whoever owns all the windows, and that comes in the next commit.

## Checklist

Using:

- GLFW 3.4 via Conan, linked `PRIVATE`
- an interface + `final` implementation

Done:

- [x] `IWindow` with `shouldClose`, `width`, `height`
- [x] `WindowSettings` with defaults
- [x] `GLFWWindow` with RAII and no OpenGL context
- [x] GLFW kept out of every header

Next: the window manager.
