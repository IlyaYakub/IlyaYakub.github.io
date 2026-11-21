---
title: "Nexora Core"
type: section
project: nexora
topic: core
date: 2026-11-21T09:00:00
tags: [cpp, nexora]
repo: https://github.com/IlyaYakub/Nexora
cover: /images/core-section-ai.webp
description: "Пять маленьких частей, на которых стоит движок Nexora: файлы, время, лог, окна и события."
---

**Nexora** — игровой движок на C++23, который я пишу с нуля. Прежде чем что-то рисовать, движку нужны пять простых вещей. Это и есть **Core**.

Весь движок крутится в одном цикле:

```cpp
while (!m_windowManager->areAllWindowsClosed())
{
    m_timer->tick();
    m_frameStatistics->update();
    m_windowManager->update();
    m_renderer->render();
}
```

Пока открыто хоть одно окно: засечь время кадра, обновить окна (клавиатура, мышь), нарисовать кадр. И так по кругу.

| Часть | Что делает | Одной строкой |
| --- | --- | --- |
| [File](/e/core-file) | Читает и пишет файлы | `File::readText("a.txt")` |
| [Timer](/e/core-timer) | Считает, сколько прошло времени | `timer.deltaSeconds()` |
| [Log](/e/core-log) | Пишет сообщения в консоль и в файл | `NX_LOG(LogFile, Error, "...")` |
| [Window](/e/core-window) | Создаёт окна и ловит ввод | `windowManager.createWindow(settings)` |
| [Event](/e/core-event) | Сообщает всем подписчикам, что что-то случилось | `event.invoke(id)` |

Каждая страница разбирает одну часть на одном коротком примере.
