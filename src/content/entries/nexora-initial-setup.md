---
title: "Nexora #1: the initial commit"
type: note
date: 2026-11-15
tags: [nexora, cpp, cmake, gamedev]
description: "What goes into the first commit of a C++ engine: folders, CMake, Conan, a precompiled header, scripts, formatting. No engine code yet."
---

![Commit 85381a9 "Initial project setup": 18 files, 303 insertions, no engine code](/images/nexora-initial-commit.svg)

Nexora is a game engine I'm writing from scratch. The long-term goal is a Nanite-like renderer. The first commit contains no engine at all: `main()` just returns 0. It only sets up the project so that every later commit is about code, not build plumbing.

## Layout

```text
Nexora/
├── .claude/CLAUDE.md          # project rules
├── Automation/
│   ├── CMAKE/CMakeHelpers.cmake
│   ├── generate_project_files.bat
│   ├── build_debug.bat
│   ├── build_release.bat
│   ├── clean.bat
│   └── format_all_files.bat
├── Config/
│   ├── conanfile.txt
│   └── .clang-format
├── Engine/
│   ├── CMakeLists.txt
│   └── Source/
│       ├── main.cpp
│       ├── pch.h
│       └── pch.cpp
├── CMakeLists.txt
├── .gitignore
├── LICENSE
└── README.md
```

Each folder has one job. `Engine/Source/` holds the code, one subfolder per module later on (`Core/`, `Log/`, `Window/`, `RHI/`, ...). `Automation/` holds everything you run by hand. `Config/` holds everything that configures tools. The root holds only what CMake and GitHub expect to find there.

## Root CMakeLists.txt

The root file sets the global options and includes the engine:

```cmake
cmake_minimum_required(VERSION 3.25)
project(Nexora VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

set_property(GLOBAL PROPERTY USE_FOLDERS ON)
set(CMAKE_SUPPRESS_REGENERATION TRUE)

include(${CMAKE_SOURCE_DIR}/Automation/CMAKE/CMakeHelpers.cmake)

add_subdirectory(Engine)
set_property(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR} PROPERTY VS_STARTUP_PROJECT NexoraEngine)
```

All binaries go to one `bin/` folder. `VS_STARTUP_PROJECT` means F5 in Visual Studio runs the engine and not `ALL_BUILD`.

## Engine: a library plus a thin executable

```cmake
project(NexoraEngine VERSION 0.1.0)

set(ENGINE_SOURCES
    Source/pch.h
    Source/pch.cpp
)

add_library(${PROJECT_NAME}Lib ${ENGINE_SOURCES})
target_include_directories(${PROJECT_NAME}Lib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/Source)

if(MSVC)
    target_compile_options(${PROJECT_NAME}Lib PUBLIC /W4 /permissive- /Zc:preprocessor /utf-8)
endif()

add_executable(${PROJECT_NAME} Source/main.cpp)
target_link_libraries(${PROJECT_NAME} PRIVATE ${PROJECT_NAME}Lib)

create_ide_folders(ENGINE_SOURCES)
setup_precompiled_headers(${PROJECT_NAME}Lib Source/pch.cpp Source/pch.h "${ENGINE_SOURCES}")
```

All engine code lives in `NexoraEngineLib`. The executable is just `main.cpp`. This split costs nothing on day one and pays off soon after: the test runner links the same library, so tests use the real engine code.

Files are listed by hand in `ENGINE_SOURCES` instead of being found with a glob. A new file is then a visible change in the diff, and CMake never misses a file it didn't know about.

Include paths start at `Source/`, so an include always reads like a module path: `#include "Window/IWindow.h"`.

## Warnings

`/W4` from the first line of code. A few commits later I added `/WX` (warnings are errors) and `/external:anglebrackets /external:W0`, so third-party headers included with `<...>` don't produce warnings. Turning on strict warnings is free on an empty project. On a project with a thousand warnings it's a weekend of cleanup.

The other flags make MSVC behave more like the standard: `/permissive-` turns on strict conformance, `/Zc:preprocessor` the conforming preprocessor, and `/utf-8` reads sources as UTF-8.

## Precompiled header

`pch.h` holds the standard headers that `.cpp` files need:

```cpp
#pragma once

#include <cstdint>
#include <format>
#include <memory>
#include <string>
#include <string_view>
#include <vector>
```

`setup_precompiled_headers` in `CMakeHelpers.cmake` compiles `pch.cpp` with `/Yc`, every other `.cpp` with `/Yu`, and force-includes the header with `/FI`. Source files never write `#include "pch.h"`. Third-party headers stay out of the PCH, in the `.cpp` files that use them.

`CMakeHelpers.cmake` also has `create_ide_folders`, which mirrors the folder tree in Visual Studio's Solution Explorer, and `system_info`, which prints the compiler and generator at configure time.

## Dependencies: Conan

```ini
[requires]
spdlog/1.16.0
glfw/3.4
gtest/1.17.0

[generators]
CMakeDeps
CMakeToolchain
```

Three dependencies to start: spdlog for the log, GLFW for windows, GoogleTest for tests. Vulkan, vk-bootstrap and glm came later. When I needed `override=True` for `vulkan-headers`, the `conanfile.txt` became a `conanfile.py`. Versions are always pinned.

## Scripts

All the scripts follow the same pattern: `cd` to the repo root, then do one thing.

```bat
@echo off
setlocal
cd /d "%~dp0.."

set CONFIG=%~1
if "%CONFIG%"=="" set CONFIG=Debug

conan install Config/conanfile.txt --output-folder=Build --build=missing -s build_type=%CONFIG% -s compiler.cppstd=23
if errorlevel 1 exit /b 1

cmake -S . -B Build -DCMAKE_TOOLCHAIN_FILE=Build/conan_toolchain.cmake
```

- `generate_project_files.bat`: Conan, then CMake configure into `Build/`
- `build_debug.bat` / `build_release.bat`: generate, then `cmake --build`
- `clean.bat`: delete `Build/`
- `format_all_files.bat`: run clang-format on every `.h`/`.cpp` in `Engine/`

The build directory is always `Build/`, and it is the first line of `.gitignore`. Delete it and you're back to a clean checkout.

## Formatting

`Config/.clang-format` is based on the Microsoft style: Allman braces, 4 spaces, 140 columns, `int* ptr`, aligned declarations and assignments, `SortIncludes: false`. The point is that nobody argues about formatting, me included: run the script, commit.

## CLAUDE.md

The last file is `.claude/CLAUDE.md`, the project rules for the AI assistant: C++23, Unreal-style architecture but simplified, naming (`m_` fields, `I` interfaces, `NX_` macros), one type per `.h/.cpp` pair, no exceptions. In the first commit it was 44 lines. It grows with every review comment I'd otherwise repeat, so it ends up being the style guide too.

## Checklist

What the first commit of a C++ project should have, roughly:

1. A folder layout where each folder has one job
2. CMake split into root options and per-target files
3. Code in a library, `main.cpp` in a thin executable
4. Strict warnings from day one
5. A precompiled header, force-included
6. A package manager with pinned versions
7. One script per action, with `Build/` in `.gitignore`
8. A formatter config and a script that runs it
9. README, LICENSE, and written-down rules

No engine code yet. That starts in the next commit, with the log.
