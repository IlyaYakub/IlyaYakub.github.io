---
title: "Event"
type: note
topic: core
date: 2026-11-21T14:00:00
tags: [cpp, nexora, delegates]
cover: /images/core-event-ai2.webp
description: "A list of listeners: add, invoke, remove. That's how engine modules talk without knowing about each other."
---

An event is a **list of listeners**. Anyone can subscribe. When something happens, `invoke` calls them all in turn. It's Unreal's multicast delegate, simplified.

## Example

```cpp
Event<int32> scoreChanged;

const auto handle = scoreChanged.add([](int32 score) { NX_LOG(LogGame, Display, "Score: {}", score); });

scoreChanged.invoke(10);
scoreChanged.remove(handle);
scoreChanged.invoke(20);
```

The log gets one line, `Score: 10`. The listener unsubscribed before the second `invoke`, so nobody heard `20`.

## How it works

Inside is a vector of "number + function" pairs:

```cpp
struct Entry
{
    EventHandle handle;
    Listener    listener;  // std::function<void(Args...)>
};

std::vector<Entry> m_listeners;
```

- `add` puts the function at the end and returns its number, an `EventHandle`. Numbers start at 1; 0 means "empty".
- `remove(handle)` deletes the entry with that number.
- `invoke(args...)` walks the vector and calls every function with those arguments.

The argument types come from the template: `Event<int32>`, `Event<WindowId>`, `Event<const InputEvent&>`.

You can subscribe an object's method, not just a lambda:

```cpp
windowCreatedEvent.add(this, &Renderer::onWindowCreated);
```

Inside, it's the same lambda: `[object, method](Args... args) { (object->*method)(args...); }`.

## Why

Modules don't know about each other. The window manager doesn't know the renderer exists. It just calls `windowCreatedEvent.invoke(id)`, and the renderer, which subscribed, creates a place to draw into for the new window.

## Input is one event

A window has one event for all input, `Event<const InputEvent&>`. What exactly happened is in a `std::variant`:

```cpp
struct InputEvent
{
    WindowId       windowId;
    InputEventData data;  // KeyEventData, MouseMoveEventData, WindowResizeEventData, ...
};
```

A listener unpacks the variant with `std::visit`. The renderer, for example, only catches resizing and closing:

```cpp
std::visit(Overloaded{
    [this, &event](const WindowResizeEventData& data) { onWindowResized(event.windowId, data.width, data.height); },
    [this, &event](const WindowCloseEventData&) { m_viewports.erase(event.windowId); },
    [](const auto&) {},
}, event.data);
```

A new kind of input is a new struct in the variant, not a new event and a new subscription.
