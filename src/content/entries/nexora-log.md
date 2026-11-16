---
title: "Nexora #2: Log and tests"
type: note
topic: nexora
date: 2026-11-15T11:00:00
tags: [cpp, spdlog, googletest]
cover: /images/nexora-log-printer.svg
description: "An Unreal-style log on top of spdlog, and the first GoogleTest test."
---

The first module of the engine is the log. Everything after it, like windows and Vulkan, reports through it.

## The idea: UE_LOG, simplified

Each call has a **category** (which module), a **verbosity** (how important) and a `std::format` message:

```cpp
DEFINE_LOG_CATEGORY_STATIC(LogMain);

NX_LOG(LogMain, Display, "Nexora {}.{}", 0, 1);
NX_LOG(LogMain, Warning, "Something looks off: {}", 42);
```

```text
[20:06:02.481] LogMain: Display: Nexora 0.1
[20:06:02.481] LogMain: Warning: Something looks off: 42 (main.cpp:9)
```

| Verbosity | Console | File | Extra |
| --- | --- | --- | --- |
| `Fatal` | yes | yes | location, then abort |
| `Error` | yes | yes | location |
| `Warning` | yes | yes | location |
| `Display` | yes | yes | |
| `Log` | no | yes | |

## Intro to spdlog

spdlog is a fast C++ logging library. We use it only inside `Log.cpp`, so it never shows up in engine headers.

- **logger**: the object you write to
- **sink**: where messages go (console, file); one logger, many sinks
- **level**: the minimum severity a logger or sink accepts
- **pattern**: the line format, `[%H:%M:%S.%e] %v`

```cpp
auto consoleSink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
consoleSink->set_level(spdlog::level::info);

auto fileSink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(path, true);
fileSink->set_level(spdlog::level::trace);

spdlog::logger logger("Nexora", {consoleSink, fileSink});
```

Our verbosity maps to spdlog levels with a plain `switch`: `Display` → `info`, `Log` → `debug`, and so on.

## Key parts

**Category** is a typed struct, not a string, so a typo doesn't compile:

```cpp
struct LogCategory
{
    std::string_view name;
};
```

**Location** comes for free from C++20, no `__FILE__` / `__LINE__`:

```cpp
std::source_location::current()
```

**Compile-time cut**: verbose calls disappear from the build completely:

```cpp
if constexpr (LogVerbosity::verbosity <= c_compileTimeVerbosity)
```

**spdlog is hidden** behind a pimpl, `class Log::Impl`, so headers stay free of third-party types.

## Intro to GoogleTest

GoogleTest is the standard C++ test framework.

- **TEST(Suite, Name)**: one test
- **EXPECT_\***: a check that keeps the test running on failure (`ASSERT_*` stops it)
- **gtest_main**: a ready-made `main()`, so the test runner is only tests

```cpp
TEST(LogTest, ShouldAcceptOnlyLogCategory)
{
    EXPECT_TRUE(ValidLogCategory<decltype(LogTest)>);
    EXPECT_FALSE(ValidLogCategory<int>);
}
```

In CMake, the tests are a separate executable that links the engine library. That's the reason the engine is a library:

```cmake
add_executable(NexoraEngineTestRunner Tests/LogTests.cpp)
target_link_libraries(NexoraEngineTestRunner PRIVATE NexoraEngineLib GTest::gtest_main)
gtest_discover_tests(NexoraEngineTestRunner)
```

## Checklist

Using:

- spdlog, hidden inside `Log.cpp`
- GoogleTest with `gtest_main`

Done:

- [x] `NX_LOG` with categories and five verbosities
- [x] Console + file (`Saved/Logs/`), location on warnings and errors, `Fatal` aborts
- [x] `Core/Types.h` (`int32`, `uint64`, ...) and `NonCopyable`
- [x] `NexoraEngineTestRunner` and the first test

Next: events.
