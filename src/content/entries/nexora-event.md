---
title: "Nexora #3: Event and tests"
type: note
topic: nexora
date: 2026-11-15T12:00:00
tags: [cpp, templates, googletest]
cover: /images/nexora-event.svg
description: "A tiny multicast event, like Unreal's multicast delegate: add, remove, invoke."
---

Modules need to tell each other that something happened, like a key press or a window resize, without knowing who listens. That's an event.

## The idea: a multicast delegate

It's the observer pattern, the same thing as Unreal's multicast delegate in a simpler form. One event, many listeners. Each call to `add` returns a handle you later pass to `remove`.

```cpp
Event<int32> onResize;

auto handle = onResize.add([](int32 width) { /* ... */ });
onResize.invoke(1600);
onResize.remove(handle);
```

| Method | What it does |
| --- | --- |
| `add(listener)` | Subscribes a lambda or function, returns an `EventHandle` |
| `add(object, &Type::method)` | Subscribes a member function |
| `remove(handle)` | Unsubscribes |
| `invoke(args...)` | Calls every listener, in subscription order |

## Key parts

**Variadic template**: one class for any argument list, `Event<>`, `Event<int32>`, `Event<const InputEvent&>`:

```cpp
template <typename... Args>
class Event final : public NonCopyable
```

**std::function** stores any callable with the right signature: lambdas, free functions, bound methods:

```cpp
using Listener = std::function<void(Args...)>;
```

**Handle** is a strong type, not a raw number. `0` means invalid, so the first handle is `1`:

```cpp
struct EventHandle
{
    uint64 value{0};
    auto operator<=>(const EventHandle&) const = default;
};
```

**Member functions** are wrapped into a lambda, so there's only one storage type:

```cpp
return add([object, method](Args... args) { (object->*method)(args...); });
```

**Storage** is a plain `std::vector` of `{handle, listener}`. Removing a listener is one `std::erase_if`.

Header-only, because it's a template.

## Tests

Each test has three steps: **arrange** (set things up), **act** (one action), **assert** (one check). The steps are separated by empty lines:

```cpp
TEST(EventTest, ShouldInvokeListenersInSubscriptionOrder)
{
    Event<int32> event;
    std::vector<int32> calls;
    event.add([&](int32 value) { calls.push_back(value); });
    event.add([&](int32 value) { calls.push_back(value * 10); });

    event.invoke(2);

    EXPECT_EQ(calls, (std::vector<int32>{2, 20}));
}
```

The second test removes a listener and checks it's never called.

## Checklist

Using:

- variadic templates, `std::function`, `operator<=>`
- GoogleTest, arrange / act / assert

Done:

- [x] `Event<Args...>` with `add`, `remove`, `invoke`
- [x] `EventHandle` as a strong id
- [x] Member-function listeners
- [x] Two tests: call order and removal

Next: the window.
