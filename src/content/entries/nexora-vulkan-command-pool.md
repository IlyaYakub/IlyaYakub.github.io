---
title: "Nexora #16: Vulkan command pool"
type: note
topic: nexora
date: 2026-11-16T13:00:00
tags: [cpp, vulkan, commands]
cover: /images/nexora-vulkan-command-pool.svg
description: "VulkanCommandPool: the memory that command buffers are allocated from, tied to one queue family."
---

GPU commands are not sent one by one. They are **recorded into a command buffer** and submitted all at once. Command buffers are not created on their own: they are **allocated from a command pool**, which owns their memory.

## Intro: pool and buffers

| Part | Role |
| --- | --- |
| `VkCommandPool` | Owns the memory for command buffers; tied to one queue family |
| `VkCommandBuffer` | A list of recorded commands, allocated from a pool |
| Queue family | Buffers from the pool can only be submitted to queues of this family |

Allocating from a pool is cheap, because the driver reuses the pool's memory instead of asking for new memory every frame.

## The class

Another small RAII wrapper. The constructor takes the device and the **queue family index**:

```cpp
VulkanCommandPool::VulkanCommandPool(const VulkanDevice& device, uint32 queueFamilyIndex) : m_device(device)
{
    const VkCommandPoolCreateInfo commandPoolInfo{
        .sType            = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
        .flags            = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
        .queueFamilyIndex = queueFamilyIndex,
    };
    NX_VULKAN_CHECK(vkCreateCommandPool(m_device.logicalDevice(), &commandPoolInfo, nullptr, &m_commandPool));
}
```

`VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT` lets each buffer be **reset on its own**. Without it, only the whole pool can be reset at once. Nexora resets one frame's buffer while the other frame's buffer may still be on the GPU, so this flag is needed.

## Who owns it

There is **one pool** for the whole RHI device. `VulkanRHIDevice` creates it right after the device, for the graphics queue family:

```cpp
m_instance    = std::make_unique<VulkanInstance>();
m_device      = std::make_unique<VulkanDevice>(*m_instance);
m_commandPool = std::make_unique<VulkanCommandPool>(*m_device, m_device->graphicsQueue().familyIndex());
```

Each of the 2 frames in flight allocates its own command buffer from it:

```cpp
const VkCommandBufferAllocateInfo commandBufferInfo{
    .sType              = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
    .commandPool        = m_commandPool.handle(),
    .level              = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
    .commandBufferCount = 1,
};
```

## Key parts

**Destruction order**: buffers must be freed before their pool is destroyed, and the pool before the device. Members are destroyed in reverse order of declaration, so it works out on its own: `Engine` declares the `Renderer` (which owns the viewports, their frames and buffers) after the RHI device, and `VulkanRHIDevice` declares the pool after the device.

**One thread for now**: a pool is not thread-safe. Recording from several threads will need a pool per thread, and that can wait until there are several threads.

## Checklist

Using:

- `vkCreateCommandPool` with `VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT`
- `vkAllocateCommandBuffers`, primary level

Done:

- [x] `VulkanCommandPool` with RAII
- [x] One pool for the graphics queue family, owned by `VulkanRHIDevice`
- [x] Buffers can be reset one by one
- [x] Vulkan types kept out of the header

Next: the Vulkan command buffer.
