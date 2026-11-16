---
title: "Nexora #6: input events"
type: note
topic: nexora
date: 2026-11-15T15:00:00
tags: [cpp, input, variant]
cover: /images/nexora-input-gumball.svg
description: "Keys, mouse and window changes as one InputEvent: engine enums and a std::variant."
---

A window now has to tell the engine what the user does: keys, mouse buttons, mouse movement, scroll, resize, close. This commit defines how that looks. Wiring it to GLFW comes in the next one.

## The idea: one event, many kinds of data

Each window has a single event, and every kind of input goes through it:

```cpp
virtual Event<const InputEvent&>& windowEvent() = 0;
```

```cpp
struct InputEvent
{
    WindowId windowId;
    InputEventData data;
};
```

`windowId` says which window it came from. `data` says what happened.

## Intro to std::variant

`std::variant<A, B, C>` holds exactly one value of one of the listed types and knows which one. It's a type-safe `union`.

| Tool | What it does |
| --- | --- |
| `std::get_if<T>(&v)` | Pointer to the value if it's a `T`, otherwise `nullptr` |
| `std::holds_alternative<T>(v)` | `true` if it's a `T` |
| `std::visit(f, v)` | Calls `f` with whatever is inside |

```cpp
using InputEventData = std::variant<KeyEventData,
                                    MouseButtonEventData,
                                    MouseMoveEventData,
                                    MouseScrollEventData,
                                    WindowResizeEventData,
                                    WindowCloseEventData>;
```

Adding a new kind of input means adding one struct to the list. The event, the window interface and existing listeners stay the same.

## Key parts

**Engine enums, not GLFW codes**: `Key::W`, not `GLFW_KEY_W`. The rest of the engine never sees GLFW, and a mapper translates the codes in one place:

```cpp
enum class Key : uint16 { Unknown, Escape, Enter, /* ... */ A, B, /* ... */ Z };
enum class MouseButton : uint8 { Unknown, Left, Right, Middle };
enum class InputAction : uint8 { Release, Press, Repeat };
```

**Small data structs**, one per kind, with defaults:

```cpp
struct KeyEventData
{
    Key key{Key::Unknown};
    InputAction action{InputAction::Press};
};
```

**Listening** means subscribing and picking out the kind you need:

```cpp
window->windowEvent().add([](const InputEvent& event)
{
    if (const auto* key = std::get_if<KeyEventData>(&event.data))
    {
        // key->key == Key::W, key->action == InputAction::Press
    }
});
```

## Checklist

Using:

- `std::variant` + `std::get_if`
- `enum class` with explicit underlying types
- `Event<const InputEvent&>` from post #3

Done:

- [x] `Key`, `MouseButton`, `InputAction` enums
- [x] Six event data structs and the `InputEventData` variant
- [x] `InputEvent` with the source `WindowId`
- [x] `IWindow::windowEvent()`

Next: GLFW callbacks and the key mapper.
