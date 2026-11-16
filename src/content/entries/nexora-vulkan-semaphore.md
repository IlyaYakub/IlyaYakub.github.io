---
title: "Nexora #15: Vulkan semaphore"
type: note
topic: nexora
date: 2026-11-16T12:00:00
tags: [cpp, vulkan, sync]
cover: /images/nexora-vulkan-semaphore-signals.svg
description: "VulkanSemaphore: how GPU steps wait for each other (acquire, render, present) without the CPU in the middle."
---

A fence lets the **CPU** wait for the GPU. A **semaphore** is for the GPU waiting for itself: one step of a frame starts only when the previous one is done, and the CPU never blocks.

## Intro: three steps of a frame

| Step | Waits on | Signals |
| --- | --- | --- |
| Acquire image | nothing | "image available" |
| Render (submit) | "image available" | "render finished" |
| Present | "render finished" | nothing |

All three calls return right away on the CPU. The order is kept on the GPU by the two semaphores.

## The class

Even smaller than the fence: create, destroy, and a handle. There is no `wait()` or `reset()`, because the CPU never touches a binary semaphore. The GPU signals it and the GPU waits on it, which also unsignals it:

```cpp
VulkanSemaphore::VulkanSemaphore(const VulkanDevice& device) : m_device(device)
{
    const VkSemaphoreCreateInfo semaphoreInfo{
        .sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO,
    };
    NX_VULKAN_CHECK(vkCreateSemaphore(m_device.logicalDevice(), &semaphoreInfo, nullptr, &m_semaphore));
}
```

## Where they are waited on

The acquire signals "image available":

```cpp
vkAcquireNextImageKHR(logicalDevice, swapchain.handle(), UINT64_MAX, semaphore, VK_NULL_HANDLE, &imageIndex);
```

The submit waits on it, but **only at the color output stage**. Everything before that stage can already run while the image is still being freed by the window system:

```cpp
const VkSemaphoreSubmitInfo waitInfo{
    .sType     = VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO,
    .semaphore = waitSemaphore.handle(),
    .stageMask = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT,
};
```

The submit signals "render finished" and present waits on it, so the image goes to the screen only once it's fully drawn.

## Two semaphores, two counts

The two kinds of semaphores live in different places, and for a reason:

- **"image available": one per frame in flight**, in `VulkanFrame`, next to the fence. The fence's `wait()` at the start of a frame proves that the last submit of this frame already waited on it, so it can be signaled again.
- **"render finished": one per swapchain image**, in `VulkanPresentationState`. Present has no fence, so nothing on the CPU says when it's done with the semaphore. But an image comes back from acquire only after its last present is done, so the semaphore of **that image** is safe to reuse.

```cpp
const VulkanSemaphore& VulkanPresentationState::currentRenderFinishedSemaphore() const
{
    return *m_renderFinishedSemaphores[m_imageIndex];
}
```

When the swapchain is recreated, the number of images can change, so these semaphores are created again in `setSwapchain()`.

## Checklist

Using:

- `vkCreateSemaphore`, binary semaphores
- `VkSemaphoreSubmitInfo` with a stage mask (synchronization2)

Done:

- [x] `VulkanSemaphore` with RAII
- [x] acquire → render → present ordered on the GPU
- [x] "Image available" per frame in flight
- [x] "Render finished" per swapchain image, recreated with the swapchain

Next: the Vulkan command pool.
