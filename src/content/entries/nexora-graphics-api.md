---
title: "Nexora #2: Graphics API"
type: note
topic: nexora
date: 2026-11-18T11:00:00
tags: [cpp, vulkan, rhi, architecture]
cover: /images/nexora-graphics-api-plug.svg
description: "Vulkan for now, but the renderer never sees it: a thin RHI lets another graphics API plug in quickly."
---

For now Nexora talks to the GPU through **Vulkan** only. But the renderer never sees Vulkan. Between them is a thin **RHI** (render hardware interface), a few small interfaces:

| Interface | What it is |
| --- | --- |
| `IRHIDevice` | The GPU; creates everything else |
| `IRHIViewport` | A window's swapchain: `beginFrame()`, `endFrame()`, `resize()` |
| `IRHICommandList` | Where the renderer records work, e.g. `beginRendering(texture, clearColor)` |
| `IRHITexture` | An image on the GPU, like the back buffer |

The only place that names the backend is one line in `Engine`:

```cpp
m_rhiDevice(std::make_unique<VulkanRHIDevice>())
```

So adding another API means a new `RHI/<Api>/` folder that implements the same four interfaces, and changing that line. The renderer and everything above it stay untouched.

<details>
<summary>Vulkan</summary>

Vulkan is an explicit, low-level GPU API. The driver does almost nothing for you: you create the device, the queues, the command buffers and the sync objects, and you say exactly when the GPU may start each step. More code than OpenGL, but nothing hidden, and that's what a Nanite-like renderer needs: compute, indirect draws, mesh shaders, control over memory.

All Vulkan code lives in `RHI/Vulkan/`. Two objects own everything: `VulkanRHIDevice` (one per engine) and `VulkanViewport` (one per window):

![VulkanRHIDevice owns instance, device, queue and command pool; VulkanViewport owns surface, swapchain and frames](/images/nexora-graphics-api/vulkan-objects.svg)

Every Vulkan call that returns a `VkResult` goes through one macro: on failure it logs `Fatal` with the call's text.

```cpp
NX_VULKAN_CHECK(vkCreateFence(logicalDevice, &fenceInfo, nullptr, &m_fence));
```

<details>
<summary>Vulkan Core: instance, device, queue</summary>

| Object | Role |
| --- | --- |
| `VkInstance` | The connection to the Vulkan loader. Everything starts here |
| `VkPhysicalDevice` | A real GPU in the machine. Only enumerated, never created |
| `VkDevice` | The logical device: our connection to that GPU, with the features we asked for |
| `VkQueue` | Where work is sent to the GPU |

**Instance.** `VulkanInstance` builds it with vk-bootstrap and asks for Vulkan 1.3. In debug builds it also turns on the **validation layer**: a layer between the app and the driver that checks every call against the spec. Its messages go into the engine log, each severity mapped to a verbosity in a flat `switch`.

**Device.** `VulkanDevice` picks the first **discrete GPU with Vulkan 1.3**; if there is none, `Fatal`. Then it creates the logical device with plain Vulkan:

- one queue from the first family with `VK_QUEUE_GRAPHICS_BIT`;
- two Vulkan 1.3 features: `synchronization2` (new submit and barriers) and `dynamicRendering` (drawing without render pass objects);
- one extension, `VK_KHR_swapchain`, to show images in a window.

**Queue.** `VulkanQueue` wraps the two calls that reach the GPU: `submit()` hands over a recorded command buffer, `present()` hands a finished image to the window.

</details>

<details>
<summary>Vulkan Commands: pool, buffer, command list</summary>

The GPU doesn't take commands one by one. The CPU **records** them into a command buffer, like a tape, then **submits** the whole buffer to a queue.

![The renderer records through IRHICommandList into a VulkanCommandBuffer, which the queue submits to the GPU](/images/nexora-graphics-api/vulkan-recording.svg)

| Type | Role |
| --- | --- |
| `VulkanCommandPool` | Owns the memory command buffers are allocated from. One, for the graphics family |
| `VulkanCommandBuffer` | One `VkCommandBuffer`: `begin()` resets and starts recording, `end()` stops |
| `VulkanCommandList` | Implements `IRHICommandList`: turns RHI calls into `vkCmd*` calls |

For example, `beginRendering` moves the image into a state it can be drawn into and starts dynamic rendering. A passed color fills the image as the pass begins; without one, the old pixels stay:

```cpp
void VulkanCommandList::beginRendering(IRHITexture& texture, const std::optional<glm::vec4>& clearColor)
{
    VulkanImage&    image = static_cast<VulkanImage&>(texture);
    const glm::vec4 color = clearColor.value_or(glm::vec4{0.0f});
    VulkanSync::transitionImage(m_commandBuffer, image, VulkanResourceState::ColorAttachment);
    const VkRenderingAttachmentInfo colorAttachment{
        .imageView   = image.view(),
        .imageLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
        .loadOp      = clearColor.has_value() ? VK_ATTACHMENT_LOAD_OP_CLEAR : VK_ATTACHMENT_LOAD_OP_LOAD,
        .clearValue  = {.color = {.float32 = {color.r, color.g, color.b, color.a}}},
        // ...
    };
    // ... VkRenderingInfo over the whole image
    vkCmdBeginRendering(m_commandBuffer.handle(), &renderingInfo);
}
```

The renderer only ever sees `IRHICommandList`. It never touches a `VkCommandBuffer`.

</details>

<details>
<summary>Vulkan Sync: fence, semaphore, barrier</summary>

The CPU and the GPU run **at the same time**, and the GPU overlaps its own work too. Vulkan keeps nothing in order by itself, so there are three tools:

| Tool | Who waits | For what |
| --- | --- | --- |
| Fence | CPU waits for GPU | Don't reuse a frame's command buffer while the GPU still reads it |
| Semaphore | GPU waits for GPU | Acquire, then render, then present, without the CPU in the middle |
| Barrier | Commands inside one buffer | Finish writing an image before the next use, and change its layout |

**Fence.** `VulkanFence` is created already signaled, so the very first frame doesn't wait forever. Each frame does `wait()`, then `reset()`, and the fence goes into the submit; the GPU signals it when it's done.

![The CPU records frame 1 while the GPU draws frame 0, and waits on the fence only when it wraps around](/images/nexora-graphics-api/fence.svg)

**Semaphore.** `VulkanSemaphore` has no CPU-side API at all: it's only passed into acquire, submit and present.

![Acquire signals S1, the submit waits on S1 only at color output and signals S2, present waits on S2](/images/nexora-graphics-api/semaphore.svg)

**Barrier.** `VulkanSync::transitionImage()` records one `synchronization2` barrier. Each `VulkanImage` remembers its state (`Unknown`, `ColorAttachment`, `Present`); a flat `switch` maps a state to its stage, access and layout, and the barrier goes from the old one to the new one:

```cpp
VulkanSync::transitionImage(commandBuffer, image, VulkanResourceState::Present);
```

![A layout transition rearranges the same pixels for the next use](/images/nexora-graphics-api/image-layout.svg)

</details>

<details>
<summary>Vulkan Presentation: surface, swapchain, frame</summary>

| Type | Role |
| --- | --- |
| `VulkanSurface` | The window as Vulkan sees it. Win32-only code lives here, under `#if defined(_WIN32)` |
| `VulkanSwapchain` | A set of images the window shows in turn. FIFO present mode (vsync) |
| `VulkanImage` | One swapchain image + its view + its current state. Implements `IRHITexture` |
| `VulkanFrame` | What one frame in flight needs: a command buffer, a fence, an "image available" semaphore |
| `VulkanPresentationState` | The swapchain, 2 frames, one "render finished" semaphore per image, and the indices |

`VulkanViewport` puts it all together. One frame looks like this:

![beginFrame waits the fence, acquires an image and begins recording; endFrame transitions to Present, submits and presents](/images/nexora-graphics-api/vulkan-frame.svg)

```cpp
viewport->beginFrame();
// the renderer records into viewport->commandList()
viewport->endFrame();
```

**Resize.** When the window changes size, the swapchain is rebuilt: wait until the GPU is idle, then construct a new `VulkanSwapchain`, passing the old handle as `oldSwapchain`. If acquire or present reports `VK_ERROR_OUT_OF_DATE_KHR`, the same happens. A minimized window (size 0) is skipped by the renderer.

</details>

</details>

<details>
<summary>DirectX 12</summary>

<p class="empty">Not started yet. It will implement the same four RHI interfaces in RHI/D3D12/.</p>

</details>

<details>
<summary>OpenGL</summary>

<p class="empty">Not started yet. It will implement the same four RHI interfaces in RHI/OpenGL/.</p>

</details>
