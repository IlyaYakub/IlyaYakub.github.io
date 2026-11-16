---
title: "Nexora #10: Vulkan dependencies"
type: note
topic: nexora
date: 2026-11-15T19:00:00
tags: [cpp, vulkan, conan, cmake]
cover: /images/nexora-vulkan-dependencies-delivery.svg
description: "Vulkan headers, the loader and vk-bootstrap via Conan, plus one macro to check every VkResult."
---

The window is ready, so it's time for the renderer. Nexora uses **Vulkan**. This commit only brings in the libraries and one check macro. No Vulkan objects yet.

## Why Vulkan

Vulkan is an explicit, low-level GPU API. You create and synchronize everything yourself: devices, queues, memory, command buffers. That's more code than OpenGL, but nothing is hidden. A Nanite-like renderer needs exactly that: compute, indirect draws, mesh shaders and control over memory.

## The three libraries

| Package | What it is |
| --- | --- |
| `vulkan-headers` | `vulkan.h`: the types and function declarations |
| `vulkan-loader` | `vulkan-1.dll`: finds the GPU driver and forwards every call to it |
| `vk-bootstrap` | A helper that removes boilerplate when creating the instance, device and swapchain |

The loader is the layer between the engine and the driver. The app calls `vkCreateInstance`, the loader finds the installed drivers (and debug layers, if any) and routes the call.

## Conan: from .txt to .py

`vk-bootstrap` and `vulkan-loader` want different versions of `vulkan-headers`. Conan stops on a conflict like that. The fix is to **override** the version for the whole graph, and only `conanfile.py` can do that:

```python
class NexoraConan(ConanFile):
    settings = "os", "compiler", "build_type", "arch"
    generators = "CMakeDeps", "CMakeToolchain"

    def requirements(self):
        self.requires("vulkan-loader/1.4.357.0")
        self.requires("vk-bootstrap/1.4.350")
        self.requires("vulkan-headers/1.4.357.0", override=True)
```

`conanfile.py` is a Python class instead of a list, so it can express rules like this.

## CMake

Same as every other dependency, linked `PRIVATE` so Vulkan types don't leak to whoever links the engine:

```cmake
find_package(VulkanLoader REQUIRED)
find_package(vk-bootstrap REQUIRED)
target_link_libraries(NexoraEngineLib PRIVATE Vulkan::Loader vk-bootstrap::vk-bootstrap)
```

## NX_VULKAN_CHECK

Almost every Vulkan call returns a `VkResult`. Negative values are errors. Zero is `VK_SUCCESS`, and positive values are non-error statuses like `VK_SUBOPTIMAL_KHR`. One macro handles all of them:

```cpp
#define NX_VULKAN_CHECK(call)                                     \
    do                                                            \
    {                                                             \
        const VkResult vulkanResult = call;                       \
        if (vulkanResult < 0)                                     \
        {                                                         \
            NX_LOG(LogVulkan, Fatal, "{} failed with VkResult {}", \
                #call, std::to_underlying(vulkanResult));         \
        }                                                         \
    } while (0)
```

`#call` turns the call into a string, so the log says exactly which call failed. `Fatal` logs the file and line and aborts, because a failed Vulkan call leaves nothing to continue with.

## Checklist

Using:

- Vulkan 1.4 headers and loader, vk-bootstrap
- Conan `override` in `conanfile.py`

Done:

- [x] Three Vulkan packages, pinned
- [x] `conanfile.txt` replaced with `conanfile.py`
- [x] Vulkan linked `PRIVATE`
- [x] `NX_VULKAN_CHECK` with `LogVulkan`

Next: the Vulkan instance.
