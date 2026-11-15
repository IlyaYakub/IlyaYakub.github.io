---
title: "Nexora #7: GLFW callbacks and key mapper"
type: note
topic: nexora
date: 2026-11-15T16:00:00
tags: [cpp, glfw, input, googletest]
cover: /images/nexora-key-mapper.svg
description: "GLFW callbacks turn into InputEvents: the user-pointer trick and a flat switch for key codes."
---

Post #6 defined `InputEvent`. This commit connects it to GLFW: every key press, click, move, scroll, resize and close now reaches the window's event.

## Intro to GLFW callbacks

GLFW is a C library. It reports input by calling a **function pointer** you register for each kind of input:

| Callback | Input |
| --- | --- |
| `glfwSetKeyCallback` | keys |
| `glfwSetMouseButtonCallback` | mouse buttons |
| `glfwSetCursorPosCallback` | mouse movement |
| `glfwSetScrollCallback` | scroll |
| `glfwSetWindowSizeCallback` | resize |
| `glfwSetWindowCloseCallback` | close |

The callbacks are called from inside `glfwPollEvents()`, which the window manager runs every frame.

## The problem: C callbacks have no `this`

A C function pointer can't be a member function, and a lambda can't capture anything if it has to become one. GLFW solves this with a **user pointer**: one `void*` stored per window.

```cpp
glfwSetWindowUserPointer(m_window, this);
```

Inside the callback, it gives back the C++ object:

```cpp
glfwSetKeyCallback(m_window,
    [](GLFWwindow* window, int32 key, int32, int32 action, int32)
    {
        auto* self = static_cast<GLFWWindow*>(glfwGetWindowUserPointer(window));
        const KeyEventData data{.key = GLFWKeyMapper::toKey(key), .action = GLFWKeyMapper::toAction(action)};
        self->m_windowEvent.invoke(InputEvent{.windowId = self->m_id, .data = data});
    });
```

The lambda has no captures, so it converts to a plain function pointer. All six callbacks follow the same three steps: get `self`, build the data, invoke the event.

The window now also knows its own `WindowId`. The manager passes it to the constructor, so every event says where it came from.

## Key mapper

GLFW gives `int` codes, the engine uses `enum class`. The mapper is the only place that knows both:

```cpp
namespace Nexora::GLFWKeyMapper
{
Key toKey(int32 glfwKey);
MouseButton toMouseButton(int32 glfwButton);
InputAction toAction(int32 glfwAction);
}
```

Inside, a plain flat `switch` with an `Unknown` fallback:

```cpp
switch (glfwKey)
{
    case GLFW_KEY_ESCAPE: return Key::Escape;
    case GLFW_KEY_W: return Key::W;
    // ...
}
return Key::Unknown;
```

It's a namespace with free functions, not a class, because it has no state.

`InputAction` also got `Unknown` as its first value. Every value enum now starts with it, and it's also the default for fields.

## Tests

One test per function, one mapping each:

```cpp
TEST(GLFWKeyMapperTest, ShouldMapKey)
{
    const Key key = GLFWKeyMapper::toKey(GLFW_KEY_W);

    EXPECT_EQ(key, Key::W);
}
```

The test runner now links `glfw` too, because the tests use GLFW's constants.

## Checklist

Using:

- GLFW callbacks + `glfwSetWindowUserPointer`
- captureless lambdas as C function pointers
- a flat `switch` for mapping

Done:

- [x] Six input callbacks, all feeding `windowEvent()`
- [x] `GLFWWindow` stores its `WindowId`
- [x] `GLFWKeyMapper`: keys, mouse buttons, actions
- [x] `InputAction::Unknown` as the default
- [x] Three mapper tests

Next: the engine class and the main loop.
