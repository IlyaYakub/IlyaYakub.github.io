---
title: "Nexora"
type: project
topic: nexora
date: 2026-11-16T11:00:00
tags: [cpp, vulkan, directx, opengl, engine]
repo: https://github.com/IlyaYakub/Nexora
cover: /images/nexora-project.svg
description: "A game engine written from scratch in C++23, with Vulkan, DirectX and OpenGL behind one RHI. Long-term goal: a Nanite-like renderer."
---

**Nexora** is a game engine I'm writing from scratch. The long-term goal is a **Nanite-like renderer**: virtualized geometry, clusters, GPU-driven culling.

The renderer talks to the GPU through an **RHI** (render hardware interface), so it doesn't depend on one graphics API. Three backends are planned: **Vulkan**, **DirectX** and **OpenGL**. Vulkan comes first.

The way there is long, so the engine is built one small step at a time, and every step gets its own note. The series is in the sidebar, or all at once on the [nexora topic page](/topic/nexora).

## Stack

| Part | Choice |
| --- | --- |
| Language | C++23, MSVC, `/W4 /WX` |
| Build | CMake, Conan 2 |
| Graphics API | Vulkan 1.3 (in progress), DirectX 12 and OpenGL (planned), all behind the RHI |
| Window and input | GLFW |
| Math | glm |
| Log | spdlog |
| Tests | GoogleTest |

## Architecture

Design and naming follow **Unreal Engine, simplified**:

- interfaces with `final` implementations, dependencies injected through interfaces;
- managers own their objects and hand them out by strong-typed id;
- RAII everywhere, no exceptions: unrecoverable failures log `Fatal`;
- a thin RHI between the renderer and Vulkan: the client records into a command list and never touches the API.

## Where it is now

- [x] Core: log, events, timer, engine loop
- [x] Window: GLFW window, window manager, input events
- [x] Vulkan RHI: instance, device, queue, sync, command buffers, swapchain, viewport
- [x] Renderer: a viewport per window, a frame every tick
- [ ] First triangle
- [ ] DirectX and OpenGL backends
- [ ] Meshes, buffers, descriptors
- [ ] GPU-driven rendering
- [ ] Clusters and virtualized geometry
