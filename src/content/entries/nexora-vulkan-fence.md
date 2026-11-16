---
title: "Nexora #14: Vulkan fence"
type: note
topic: nexora
date: 2026-11-16T11:00:00
tags: [cpp, vulkan, sync]
cover: /images/nexora-vulkan-fence.svg
description: "VulkanFence: how the CPU waits for the GPU, so a frame's command buffer is never rewritten while the GPU still reads it."
---

The CPU and the GPU run **at the same time**. After a submit, the CPU goes on to the next frame right away while the GPU is still drawing the last one. A **fence** is how the CPU finds out the GPU is done.

## Intro: who waits for whom

| Primitive | Signaled by | Waited on by | Used for |
| --- | --- | --- | --- |
| Fence | GPU, when a submit finishes | CPU (`vkWaitForFences`) | Don't reuse a frame's resources too early |
| Semaphore | GPU | GPU | Order steps on the GPU: acquire → render → present |

A fence has two states, **signaled** and **unsignaled**. The GPU signals it, the CPU waits for it and resets it.

## The class

The smallest RAII wrapper: create in the constructor, destroy in the destructor, and two actions:

```cpp
void VulkanFence::wait() const
{
    NX_VULKAN_CHECK(vkWaitForFences(m_device.logicalDevice(), 1, &m_fence, VK_TRUE, UINT64_MAX));
}

void VulkanFence::reset() const
{
    NX_VULKAN_CHECK(vkResetFences(m_device.logicalDevice(), 1, &m_fence));
}
```

`UINT64_MAX` means wait as long as it takes: if the GPU never finishes, something is already broken.

The fence keeps a reference to `VulkanDevice`, because both destroying and waiting need the logical device.

## Created signaled

```cpp
const VkFenceCreateInfo fenceInfo{
    .sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO,
    .flags = VK_FENCE_CREATE_SIGNALED_BIT,
};
```

Every frame starts with `wait()`. On the very first frame nothing was submitted yet, so an unsignaled fence would block forever. Creating it **signaled** lets the first wait pass at once.

## One fence per frame in flight

The engine keeps **2 frames in flight**. Each `VulkanFrame` has its own command buffer and its own fence:

```cpp
// acquire image ->
inFlightFence.wait();
m_presentationState.setImageIndex(acquireNextImage(imageAvailableSemaphore));
inFlightFence.reset();

commandBuffer.begin();
```

- **wait**: the GPU has finished the submit that used this frame two frames ago, so its command buffer can be recorded again;
- **reset**: back to unsignaled, right before new work for this frame starts;
- **submit**: the fence goes into `vkQueueSubmit2`, and the GPU signals it when this frame's work is done.

While the GPU draws frame N, the CPU already records frame N+1 into the other command buffer. It waits only if it gets two frames ahead.

## Checklist

Using:

- `vkCreateFence` with `VK_FENCE_CREATE_SIGNALED_BIT`
- `vkWaitForFences`, `vkResetFences`

Done:

- [x] `VulkanFence` with RAII
- [x] Created signaled, so the first frame doesn't block
- [x] One fence per frame in flight, wait → reset → submit
- [x] Vulkan types kept out of the header

Next: the Vulkan semaphore.
