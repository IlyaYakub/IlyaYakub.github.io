---
title: "Nexora #13: Vulkan queue"
type: note
topic: nexora
date: 2026-11-16T10:00:00
tags: [cpp, vulkan]
cover: /images/nexora-vulkan-queue-pipe.svg
description: "VulkanQueue: the one place where recorded work reaches the GPU and finished images reach the screen."
---

Recording commands does nothing on its own. The GPU starts working only when a command buffer is **submitted to a queue**, and an image shows up in the window only when it is **presented through a queue**. `VulkanQueue` wraps both calls.

## Intro: queues and families

| Part | Role |
| --- | --- |
| Queue family | A group of queues with the same abilities: graphics, compute, transfer, present |
| `VkQueue` | One queue from a family; work submitted to it runs in order |
| Submit | Hands a command buffer to the GPU, with semaphores to wait on and signal |
| Present | Hands a finished swapchain image to the window system |

For now Nexora uses **one graphics queue**. `VulkanDevice` picks the first family with `VK_QUEUE_GRAPHICS_BIT`, asks for one queue in it when creating the logical device, and the swapchain later checks that this family can present to the window surface.

## Getting the queue

A queue is not created, it is **taken from the device**. It lives as long as the device, so `VulkanQueue` has no destructor:

```cpp
VulkanQueue::VulkanQueue(VkDevice_T* device, uint32 familyIndex) : m_familyIndex(familyIndex)
{
    vkGetDeviceQueue(device, m_familyIndex, 0, &m_queue);
}
```

`VulkanDevice` owns it as a `std::unique_ptr` and hands it out by reference:

```cpp
m_graphicsQueue = std::make_unique<VulkanQueue>(m_logicalDevice, graphicsQueueFamilyIndex);
```

The family index is kept too: the command pool and the swapchain need it.

## Submit

Submit uses `vkQueueSubmit2` from synchronization2 (core in Vulkan 1.3). Each semaphore gets its own info struct with the pipeline stage it applies to:

```cpp
const VkSemaphoreSubmitInfo waitInfo{
    .sType     = VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO,
    .semaphore = waitSemaphore.handle(),
    .stageMask = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT,
};
```

- **wait** on "image available" only at the color output stage: the GPU can start everything before it while the swapchain image is still being acquired;
- **signal** "render finished" when all commands are done;
- **fence** tells the CPU that this frame's command buffer is free to record again.

## Present

Present waits on "render finished" and shows the image by its index:

```cpp
const VkResult result = vkQueuePresentKHR(m_queue, &presentInfo);
if (result == VK_ERROR_OUT_OF_DATE_KHR)
{
    return;
}
NX_VULKAN_CHECK(result);
```

`VK_ERROR_OUT_OF_DATE_KHR` means the window changed size and the swapchain no longer fits. It's not an error here: the next image acquire hits the same result and the viewport recreates the swapchain there.

## One frame

The viewport ends a frame with two calls:

```cpp
graphicsQueue.submit(commandBuffer, imageAvailableSemaphore, renderFinishedSemaphore, inFlightFence);
graphicsQueue.present(swapchain, imageIndex, renderFinishedSemaphore);
```

The client never calls the queue itself: it records into a command list, and submit and present stay inside the Vulkan RHI.

## Checklist

Using:

- `vkGetDeviceQueue`, `vkQueueSubmit2`, `vkQueuePresentKHR`
- Semaphores between GPU steps, a fence back to the CPU

Done:

- [x] `VulkanQueue` taken from the device, owned by `VulkanDevice`
- [x] Submit with synchronization2
- [x] Present with out-of-date left to swapchain recreation
- [x] Vulkan types kept out of the header

Next: fences and semaphores.
