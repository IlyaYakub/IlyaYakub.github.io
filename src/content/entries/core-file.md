---
title: "File"
type: note
topic: core
date: 2026-11-21T10:00:00
tags: [cpp, nexora, std-expected]
cover: /images/core-file-docs.svg
description: "Прочитать файл одной строкой и честно узнать, если его нет: std::expected и итераторы потока."
---

`File` — это четыре функции: прочитать или записать текст, прочитать или записать байты.

## Пример

Компилятор шейдеров читает исходник шейдера:

```cpp
const auto source = File::readText("Shaders/Triangle.slang");
if (!source)
{
    return std::unexpected(ShaderCompileError::CompilationFailed);
}

compile(*source);
```

`readText` возвращает не строку, а **«строку или ошибку»**:

```cpp
std::expected<std::string, FileError> readText(const std::filesystem::path& path);
```

- Файл открылся — внутри лежит текст, достаём его через `*source`.
- Не открылся — внутри `FileError::OpenFailed`, и `if (!source)` это ловит.

Почему не `Fatal`? Пропавший шейдер — не конец света: вызывающий код сам решит, что делать. Поэтому `File` только пишет `Error` в лог и возвращает ошибку.

## Как читается файл

```cpp
std::ifstream stream(path, std::ios::binary);
if (!stream.is_open())
{
    NX_LOG(LogFile, Error, "Failed to open {} for reading", path.string());
    return std::unexpected(FileError::OpenFailed);
}

return std::string(std::istreambuf_iterator<char>(stream), std::istreambuf_iterator<char>());
```

`istreambuf_iterator` — итератор, который на каждом шаге берёт из файла следующий байт. Пустой итератор означает «конец файла». Строка строится из диапазона «от начала до конца», то есть из всего файла.

`std::ios::binary` нужен, чтобы Windows не превращала `\r\n` в `\n`: что лежит в файле, то и прочитали.

## Текст и байты — один код

Для текста нужен `std::string`, для байтов — `std::vector<uint8>`. Код чтения у них одинаковый, поэтому он один, шаблонный:

```cpp
template <typename Container>
std::expected<Container, FileError> readFile(const std::filesystem::path& path);

readFile<std::string>(path);         // readText
readFile<std::vector<uint8>>(path);  // readBinary
```

Запись — зеркально: `std::ofstream`, а байты копируются в файл через `std::ranges::copy` в `ostreambuf_iterator`.
