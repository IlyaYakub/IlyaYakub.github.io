---
title: "Timer"
type: note
topic: core
date: 2026-11-21T11:00:00
tags: [cpp, nexora, chrono]
cover: /images/core-timer-stopwatch.svg
description: "Сколько длился кадр и сколько прошло с запуска: steady_clock, deltaSeconds и totalSeconds."
---

`Timer` отвечает на два вопроса: **сколько длился прошлый кадр** и **сколько прошло с запуска**.

## Пример

Кубик должен лететь со скоростью 5 метров в секунду — на любом компьютере:

```cpp
Timer timer;

while (isRunning)
{
    timer.tick();
    position += 5.0f * timer.deltaSeconds();
}
```

- 60 кадров в секунду: кадр длится ≈ 0.0167 с, кубик сдвигается на 0.083 м за кадр.
- 30 кадров в секунду: кадр ≈ 0.033 с, сдвиг 0.167 м за кадр.

За секунду кубик в обоих случаях пролетает ровно 5 метров. Без `deltaSeconds` быстрый компьютер двигал бы его вдвое быстрее.

## Как устроен

Таймер помнит два момента: старт и прошлый `tick()`.

```cpp
void Timer::tick()
{
    const auto now = std::chrono::steady_clock::now();
    m_deltaSeconds = std::chrono::duration<float>(now - m_lastTickTime).count();
    m_totalSeconds = std::chrono::duration<float>(now - m_startTime).count();
    m_lastTickTime = now;
}
```

- `deltaSeconds` — от прошлого `tick()` до этого.
- `totalSeconds` — от создания таймера до этого `tick()`.
- `duration<float>` переводит разницу во времени в секунды-дроби: `0.0167`.

`steady_clock` — часы, которые идут только вперёд. Если перевести системное время, обычные часы прыгнут, а `steady_clock` — нет, и кадр не получит отрицательную длину.

## Где используется

`Engine` вызывает `tick()` в начале каждого кадра. `FrameStatistics` раз в секунду берёт `totalSeconds`, считает кадры и пишет их в заголовок окна:

```text
Nexora 0.1.0 | 60 FPS | 16.67 ms
```
