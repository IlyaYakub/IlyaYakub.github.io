---
title: "Event"
type: note
topic: core
date: 2026-11-21T14:00:00
tags: [cpp, nexora, delegates]
cover: /images/core-event-ai2.webp
description: "Список слушателей: add, invoke, remove. Так модули движка общаются, не зная друг о друге."
---

Событие — это **список слушателей**. Кто угодно может подписаться. Когда что-то случилось, `invoke` вызывает всех по очереди. Это упрощённый multicast delegate из Unreal.

## Пример

```cpp
Event<int32> scoreChanged;

const auto handle = scoreChanged.add([](int32 score) { NX_LOG(LogGame, Display, "Score: {}", score); });

scoreChanged.invoke(10);
scoreChanged.remove(handle);
scoreChanged.invoke(20);
```

В логе будет одна строка — `Score: 10`. Перед вторым `invoke` слушатель отписался, и `20` никто не услышал.

## Как устроен

Внутри — вектор пар «номер + функция»:

```cpp
struct Entry
{
    EventHandle handle;
    Listener    listener;  // std::function<void(Args...)>
};

std::vector<Entry> m_listeners;
```

- `add` кладёт функцию в конец и возвращает её номер — `EventHandle`. Номера идут с 1, а 0 значит «пустой».
- `remove(handle)` удаляет запись с этим номером.
- `invoke(args...)` проходит по вектору и вызывает каждую функцию с этими аргументами.

Типы аргументов задаются шаблоном: `Event<int32>`, `Event<WindowId>`, `Event<const InputEvent&>`.

Подписать можно не только лямбду, но и метод объекта:

```cpp
windowCreatedEvent.add(this, &Renderer::onWindowCreated);
```

Внутри это та же лямбда: `[object, method](Args... args) { (object->*method)(args...); }`.

## Зачем

Модули не знают друг о друге. Менеджер окон не знает, что существует рендерер. Он просто вызывает `windowCreatedEvent.invoke(id)`, а рендерер, который подписался, создаёт для нового окна место, куда рисовать.

## Ввод — одно событие

У окна одно событие на весь ввод — `Event<const InputEvent&>`. Что именно случилось, лежит в `std::variant`:

```cpp
struct InputEvent
{
    WindowId       windowId;
    InputEventData data;  // KeyEventData, MouseMoveEventData, WindowResizeEventData, ...
};
```

Слушатель разбирает вариант через `std::visit`. Рендерер, например, ловит только изменение размера и закрытие окна:

```cpp
std::visit(Overloaded{
    [this, &event](const WindowResizeEventData& data) { onWindowResized(event.windowId, data.width, data.height); },
    [this, &event](const WindowCloseEventData&) { m_viewports.erase(event.windowId); },
    [](const auto&) {},
}, event.data);
```

Новый тип ввода — это новая структура в варианте, а не новое событие и новая подписка.
