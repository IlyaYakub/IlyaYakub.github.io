---
title: "Nexora #17: Vulkan command buffer"
type: note
topic: nexora
date: 2026-11-16T14:00:00
tags: [cpp, vulkan, commands]
cover: /images/nexora-vulkan-command-buffer-tape.svg
description: "VulkanCommandBuffer: a tape the CPU records GPU commands on, then hands to the queue to play."
---

The GPU doesn't take commands one at a time. The CPU **records** them into a command buffer, then **submits** the whole buffer to a queue. It works like a tape: record, stop, play, and record over it next frame.

## Intro: the life of a buffer

| State | How it gets there | What it means |
| --- | --- | --- |
| Initial | allocated, or reset | empty tape |
| Recording | `vkBeginCommandBuffer` | `vkCmd*` calls are written into it |
| Executable | `vkEndCommandBuffer` | ready to submit |
| Pending | `vkQueueSubmit2` | the GPU is playing it; don't touch |

A pending buffer goes back to executable when the GPU is done. The frame's fence says when that happened.

## The class

The constructor **allocates** one primary buffer from the pool, and the destructor **frees** it back:

```cpp
const VkCommandBufferAllocateInfo commandBufferInfo{
    .sType              = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
    .commandPool        = m_commandPool.handle(),
    .level              = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
    .commandBufferCount = 1,
};
NX_VULKAN_CHECK(vkAllocateCommandBuffers(m_device.logicalDevice(), &commandBufferInfo, &m_commandBuffer));
```

The buffer keeps a reference to its pool, because `vkFreeCommandBuffers` needs both the device and the pool:

```cpp
VulkanCommandBuffer::~VulkanCommandBuffer()
{
    vkFreeCommandBuffers(m_device.logicalDevice(), m_commandPool.handle(), 1, &m_commandBuffer);
}
```

**Primary** means it can be submitted to a queue directly. Secondary buffers are only called from primary ones; Nexora doesn't need them yet.

## begin and end

```cpp
void VulkanCommandBuffer::begin() const
{
    const VkCommandBufferBeginInfo beginInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
        .flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT,
    };
    NX_VULKAN_CHECK(vkResetCommandBuffer(m_commandBuffer, 0));
    NX_VULKAN_CHECK(vkBeginCommandBuffer(m_commandBuffer, &beginInfo));
}
```

- **reset**: wipe last frame's commands. This is allowed because the pool was created with `RESET_COMMAND_BUFFER_BIT`;
- **`ONE_TIME_SUBMIT`**: a hint to the driver that this recording is submitted once and then recorded again, so it doesn't need to keep it ready for replays;
- **end**: just `vkEndCommandBuffer`. After it the buffer is executable.

## Where it lives

Each `VulkanFrame` owns one buffer next to its fence and semaphore, so there are 2, one per frame in flight. A frame goes like this:

```cpp
inFlightFence.wait();      // the GPU finished playing this buffer
...
commandBuffer.begin();     // reset and record
// ... the renderer records through the command list ...
commandBuffer.end();
graphicsQueue.submit(commandBuffer, ...);
```

The renderer never sees `VulkanCommandBuffer` itself. It records through `VulkanCommandList`, which wraps the buffer and turns RHI calls like `beginRendering()` into `vkCmd*` calls. It gets its own note a bit later.

## Checklist

Using:

- `vkAllocateCommandBuffers` / `vkFreeCommandBuffers`, primary level
- `vkResetCommandBuffer`, `vkBeginCommandBuffer` with `ONE_TIME_SUBMIT`, `vkEndCommandBuffer`

Done:

- [x] `VulkanCommandBuffer` with RAII, freed back to its pool
- [x] `begin()` resets and starts recording, `end()` finishes it
- [x] One buffer per frame in flight, guarded by the frame's fence
- [x] Vulkan types kept out of the header

Next: the Vulkan image.
