---
title: "File"
type: note
topic: core
date: 2026-11-21T10:00:00
tags: [cpp, nexora, std-expected]
cover: /images/core-file-ai2.webp
description: "Read a file in one line and know for sure when it isn't there: std::expected and stream iterators."
---

`File` is four functions: read or write text, read or write bytes.

## Example

The shader compiler reads a shader's source:

```cpp
const auto source = File::readText("Shaders/Triangle.slang");
if (!source)
{
    return std::unexpected(ShaderCompileError::CompilationFailed);
}

compile(*source);
```

`readText` doesn't return a string. It returns **"a string or an error"**:

```cpp
std::expected<std::string, FileError> readText(const std::filesystem::path& path);
```

- The file opened: the text is inside, you get it with `*source`.
- It didn't: inside is `FileError::OpenFailed`, and `if (!source)` catches it.

Why not `Fatal`? A missing shader isn't the end of the world: the caller decides what to do. So `File` only logs an `Error` and returns the error.

## How a file is read

```cpp
std::ifstream stream(path, std::ios::binary);
if (!stream.is_open())
{
    NX_LOG(LogFile, Error, "Failed to open {} for reading", path.string());
    return std::unexpected(FileError::OpenFailed);
}

return std::string(std::istreambuf_iterator<char>(stream), std::istreambuf_iterator<char>());
```

`istreambuf_iterator` is an iterator that takes the next byte from the file on every step. An empty iterator means "end of file". The string is built from the range "from the start to the end", which is the whole file.

`std::ios::binary` stops Windows from turning `\r\n` into `\n`: what's in the file is what you read.

## Text and bytes share one code path

Text needs a `std::string`, bytes need a `std::vector<uint8>`. The reading code is the same for both, so there is just one, a template:

```cpp
template <typename Container>
std::expected<Container, FileError> readFile(const std::filesystem::path& path);

readFile<std::string>(path);         // readText
readFile<std::vector<uint8>>(path);  // readBinary
```

Writing mirrors it: `std::ofstream`, and the bytes are copied into the file with `std::ranges::copy` into an `ostreambuf_iterator`.
