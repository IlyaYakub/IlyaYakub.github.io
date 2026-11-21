---
title: "Timer"
type: note
topic: core
date: 2026-11-21T11:00:00
tags: [cpp, nexora, chrono]
cover: /images/core-timer-ai2.webp
description: "How long the last frame took and how long since start: steady_clock, deltaSeconds and totalSeconds."
---

`Timer` answers two questions: **how long the last frame took** and **how long since the start**.

## Example

A cube should fly at 5 meters per second, on any computer:

```cpp
Timer timer;

while (isRunning)
{
    timer.tick();
    position += 5.0f * timer.deltaSeconds();
}
```

- At 60 frames per second a frame takes ≈ 0.0167 s, and the cube moves 0.083 m per frame.
- At 30 frames per second a frame takes ≈ 0.033 s, and it moves 0.167 m per frame.

Either way the cube covers exactly 5 meters per second. Without `deltaSeconds` a fast computer would move it twice as fast.

## How it works

The timer remembers two moments: the start and the last `tick()`.

```cpp
void Timer::tick()
{
    const auto now = std::chrono::steady_clock::now();
    m_deltaSeconds = std::chrono::duration<float>(now - m_lastTickTime).count();
    m_totalSeconds = std::chrono::duration<float>(now - m_startTime).count();
    m_lastTickTime = now;
}
```

- `deltaSeconds` is from the previous `tick()` to this one.
- `totalSeconds` is from the timer's creation to this `tick()`.
- `duration<float>` turns a time difference into fractional seconds: `0.0167`.

`steady_clock` is a clock that only goes forward. If someone changes the system time, a regular clock jumps, `steady_clock` doesn't, so a frame never gets a negative length.

## Where it's used

`Engine` calls `tick()` at the start of every frame. Once a second `FrameStatistics` takes `totalSeconds`, counts the frames and writes them into the window title:

```text
Nexora 0.1.0 | 60 FPS | 16.67 ms
```
