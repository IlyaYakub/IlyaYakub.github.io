---
title: "Window"
type: note
topic: core
date: 2026-11-21T13:00:00
tags: [cpp, nexora, glfw]
cover: /images/core-window-frame.svg
description: "Открыть окно, держать его живым и превратить нажатие клавиши в событие движка. GLFW спрятан за интерфейсами."
---

Движок знает только два интерфейса: `IWindow` (одно окно) и `IWindowManager` (все окна). За ними — GLFW, в классах `GLFWWindow` и `GLFWWindowManager`.

## Пример

Так `Engine` открывает главное окно и крутит цикл:

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

Нажали крестик — окно закрылось — цикл закончился.

## createWindow

Менеджер хранит окна в словаре «номер → окно»:

```cpp
std::unordered_map<WindowId, std::shared_ptr<IWindow>> m_windows;
```

`createWindow` берёт следующий номер, создаёт `GLFWWindow`, кладёт его в словарь и сообщает всем через `windowCreatedEvent`, что появилось новое окно. Наружу отдаётся только номер — `WindowId`. Само окно можно попросить по номеру: `getWindowById(id)`.

## update

Один вызов в кадр, три шага:

```cpp
void GLFWWindowManager::update()
{
    glfwPollEvents();
    removeClosedWindows();
    waitWhileAllWindowsMinimized();
}
```

1. Забрать у системы всё, что случилось: клавиши, мышь, крестик.
2. Выкинуть закрытые окна. Когда словарь опустеет, `areAllWindowsClosed()` вернёт `true`.
3. Если все окна свёрнуты — спать в `glfwWaitEvents()`, пока что-нибудь не произойдёт. Свёрнутый движок не грузит процессор.

## Нажатие клавиши

Нажали `W`. GLFW вызывает нашу лямбду, и она делает из этого событие движка:

```cpp
glfwSetKeyCallback(m_window, [](GLFWwindow* window, int32 key, int32, int32 action, int32)
{
    auto* self = static_cast<GLFWWindow*>(glfwGetWindowUserPointer(window));
    const KeyEventData data{.key = GLFWKeyMapper::toKey(key), .action = GLFWKeyMapper::toAction(action)};
    self->m_windowEvent.invoke({.windowId = self->m_id, .data = data});
});
```

- GLFW вызывает простую функцию и не знает про наш объект. Поэтому при создании окна мы кладём в GLFW указатель `this` (`glfwSetWindowUserPointer`), а в лямбде достаём его обратно.
- `GLFWKeyMapper` переводит `GLFW_KEY_W` в наш `Key::W`. Дальше движок видит только свои типы.
- `m_windowEvent.invoke(...)` раздаёт событие всем, кто подписан на это окно. Как работают события — на странице [Event](/e/core-event).

Мышь, колёсико, изменение размера и закрытие окна устроены точно так же.
