---
title: "Nexora #1: the initial commit"
type: note
topic: nexora
date: 2026-11-15
tags: [cpp, cmake, conan, setup]
cover: /images/nexora-initial-commit.svg
description: "Environment, a short intro to CMake and Conan, and what the first commit sets up."
---

Nexora is a game engine I'm writing from scratch. The long-term goal is a Nanite-like renderer.

## Environment

| Tool | Role |
| --- | --- |
| Visual Studio 2026 (MSVC) | Compiler and IDE, C++23 |
| CMake 3.25+ | Describes the project, generates the `.sln` |
| Conan 2 | Downloads and builds third-party libraries |
| clang-format | One code style, applied by a script |
| Git | History, one commit per step |

## Intro to CMake

CMake doesn't build anything itself. It reads `CMakeLists.txt` and generates a project for a real build tool, here a Visual Studio solution.

A project is made of **targets**: libraries and executables. Each target has its own sources, include paths, flags and dependencies.

How Nexora uses it: the root file sets global options, `Engine/` holds the targets. The engine code is a library, the executable only has `main.cpp`, so tests can link the same library later.

Root:

```cmake
cmake_minimum_required(VERSION 3.25)
project(Nexora LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 23)
add_subdirectory(Engine)
```

Engine:

```cmake
add_library(NexoraEngineLib ${ENGINE_SOURCES})
target_include_directories(NexoraEngineLib PUBLIC Source)

add_executable(NexoraEngine Source/main.cpp)
target_link_libraries(NexoraEngine PRIVATE NexoraEngineLib)
```

Commands we'll need:

| Command | What it does |
| --- | --- |
| `project()` | Names the project, sets the language |
| `add_subdirectory()` | Includes another `CMakeLists.txt` |
| `add_library()` / `add_executable()` | Creates a target |
| `target_link_libraries()` | Adds a dependency to a target |
| `target_include_directories()` | Adds include paths |
| `target_compile_options()` | Adds compiler flags (`/W4`, ...) |
| `find_package()` | Finds an installed library, e.g. from Conan |

`PUBLIC` passes a setting on to everyone who links the target, `PRIVATE` keeps it inside.

## Intro to Conan

Conan is a package manager for C++. It downloads (or builds) libraries for your exact compiler and configuration and tells CMake where they are.

Terms:

- **conanfile**: the list of dependencies for the project
- **requires**: one dependency with a pinned version, `spdlog/1.16.0`
- **settings**: what packages are built for: OS, compiler, `build_type`, `cppstd`
- **generators**: the files Conan writes for the build system

```ini
[requires]
spdlog/1.16.0
glfw/3.4
gtest/1.17.0

[generators]
CMakeDeps
CMakeToolchain
```

`CMakeDeps` makes `find_package()` work, `CMakeToolchain` writes `conan_toolchain.cmake` with the paths and settings.

Usage, two commands:

```bat
conan install Config/conanfile.txt --output-folder=Build --build=missing -s compiler.cppstd=23
cmake -S . -B Build -DCMAKE_TOOLCHAIN_FILE=Build/conan_toolchain.cmake
```

After that, a library is used like any other:

```cmake
find_package(spdlog REQUIRED)
target_link_libraries(NexoraEngineLib PRIVATE spdlog::spdlog)
```

## Checklist

Using:

- MSVC and C++23
- CMake
- Conan 2 with pinned versions
- clang-format

Done in the first commit:

- [x] Root and engine `CMakeLists.txt`
- [x] Engine as a library and a thin executable
- [x] `conanfile` with spdlog, GLFW and GoogleTest
- [x] Build, clean and format scripts
- [x] `.clang-format`, `.gitignore`, README, LICENSE

Next: the log.
