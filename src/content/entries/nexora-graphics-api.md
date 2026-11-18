---
title: "Nexora #2: Graphics API"
type: post
topic: nexora
date: 2026-11-18T11:00:00
tags: [cpp, vulkan, rhi, architecture]
cover: /images/nexora-graphics-api-plug.svg
description: "Vulkan for now, but the renderer never sees it: a thin RHI lets another graphics API plug in quickly."
---

For now Nexora talks to the GPU through **Vulkan** only. It's explicit and low-level: nothing hidden, full control over memory and sync, compute and mesh shaders. That's what a Nanite-like renderer needs.

But the renderer never sees Vulkan. Between them is a thin **RHI** (render hardware interface), a few small interfaces:

| Interface | What it is |
| --- | --- |
| `IRHIDevice` | The GPU; creates everything else |
| `IRHIViewport` | A window's swapchain: `beginFrame()`, `endFrame()`, `resize()` |
| `IRHICommandList` | Where the renderer records work, e.g. `beginRendering(texture, clearColor)` |
| `IRHITexture` | An image on the GPU, like the back buffer |

```cpp
m_viewports.emplace(id, m_rhiDevice.createViewport(window->nativeHandle(), window->width(), window->height()));
```

All Vulkan code lives in `RHI/Vulkan/`: instance, device, queue, fences, semaphores, command buffers, swapchain. The only place that names it is one line in `Engine`:

```cpp
m_rhiDevice(std::make_unique<VulkanRHIDevice>())
```

So adding **DirectX 12** or **OpenGL** later means a new `RHI/D3D12/` folder that implements the same four interfaces, and changing that one line. The renderer and everything above it stay untouched.
