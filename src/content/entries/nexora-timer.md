---
title: "Nexora #9: Timer and tests"
type: note
topic: nexora
date: 2026-11-15T18:00:00
tags: [cpp, chrono, googletest]
cover: /images/nexora-timer.svg
description: "Delta time and total time from std::chrono::steady_clock, ticked once per frame."
---

Everything that moves in a game, like animation, physics or a camera, needs to know how much time passed since the last frame. That number is **delta time**. This commit adds a `Timer` that measures it.

## Why delta time

Frames aren't equal: one takes 16 ms, the next 33 ms because something loaded. If an object moves "5 units per frame", it moves at a different speed on every machine. If it moves `speed * deltaSeconds`, it moves the same everywhere.

| Value | What it is |
| --- | --- |
| `deltaSeconds()` | Time between the last two `tick()` calls |
| `totalSeconds()` | Time since the timer was created |

## Intro to std::chrono

`std::chrono` is the standard time library.

- **clock**: where time comes from
- **time_point**: a moment on that clock
- **duration**: the difference between two time points

Of the clocks, two matter here. `steady_clock` is the one for measuring intervals: it only moves forward and doesn't jump when the system time changes. `system_clock` is wall-clock time and can jump.

```cpp
const auto start = std::chrono::steady_clock::now();
// ...
const float seconds = std::chrono::duration<float>(std::chrono::steady_clock::now() - start).count();
```

`duration<float>` means "seconds as a float", and `.count()` gives the number.

## The Timer

```cpp
void Timer::tick()
{
    const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
    m_deltaSeconds = std::chrono::duration<float>(now - m_lastTickTime).count();
    m_totalSeconds = std::chrono::duration<float>(now - m_startTime).count();
    m_lastTickTime = now;
}
```

The engine owns it like the window manager, as a `std::unique_ptr`, and ticks it once at the top of every frame:

```cpp
while (!m_windowManager->areAllWindowsClosed())
{
    m_timer->tick();
    m_windowManager->update();
}
```

`float` seconds are what gameplay code wants to multiply by, so the getters return `float`, not a `duration`.

## Tests

Time-based tests are tricky because exact numbers aren't stable. So the test checks only the essential thing: after a short sleep, the delta is positive.

```cpp
TEST(TimerTest, ShouldMeasureElapsedTimeBetweenTicks)
{
    Timer timer;
    timer.tick();
    std::this_thread::sleep_for(std::chrono::milliseconds(10));

    timer.tick();

    EXPECT_GT(timer.deltaSeconds(), 0.0f);
}
```

## Checklist

Using:

- `std::chrono::steady_clock`, `duration<float>`
- `std::unique_ptr` ownership in `Engine`

Done:

- [x] `Timer` with `tick()`, `deltaSeconds()`, `totalSeconds()`
- [x] Ticked once per frame in `Engine::run()`
- [x] One test: delta is positive after a sleep

Next: aligning declarations and grouping methods.
