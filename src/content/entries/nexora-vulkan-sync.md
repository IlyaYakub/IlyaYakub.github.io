---
title: "Nexora #19: Vulkan sync"
type: note
topic: nexora
date: 2026-11-16T16:00:00
tags: [cpp, vulkan, sync]
cover: /images/nexora-vulkan-sync-lock.svg
description: "VulkanSync: one function that moves an image from one state to another with a synchronization2 barrier."
---

Fences and semaphores order **whole submits**. Inside one command buffer the GPU also needs ordering: rendering must finish writing before the image is presented, and the image must be in the right **layout** for each use. That's the job of a **pipeline barrier**.

## Intro: what a barrier says

| Part | Meaning |
| --- | --- |
| `srcStageMask` | Wait until these earlier stages are done... |
| `srcAccessMask` | ...and make their writes visible |
| `dstStageMask` | Only then let these later stages start |
| `dstAccessMask` | ...with this kind of access |
| `oldLayout` → `newLayout` | Rearrange the image's pixels for the next use |

It works like a canal lock: the gate behind the boat closes (src), the water level changes (layout), and the gate ahead opens (dst).

## One state, three values

The engine doesn't pass stages and layouts around. It has `VulkanResourceState`, and one flat `switch` turns a state into the three values a barrier needs:

```cpp
struct SyncState
{
    VkPipelineStageFlags2 stage{VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT};
    VkAccessFlags2        access{VK_ACCESS_2_NONE};
    VkImageLayout         layout{VK_IMAGE_LAYOUT_UNDEFINED};
};
```

| State | Stage | Access | Layout |
| --- | --- | --- | --- |
| `Unknown` | all commands | none | `UNDEFINED` |
| `ColorAttachment` | color attachment output | color attachment read, write | `COLOR_ATTACHMENT_OPTIMAL` |
| `Present` | color attachment output | none | `PRESENT_SRC_KHR` |

`SyncState` and the mapper live in an anonymous namespace in the `.cpp`: nobody outside needs them.

## transitionImage

The old state comes from the image itself (that's why `VulkanImage` remembers it), the new one from the caller:

```cpp
const SyncState oldSyncState = toSyncState(image.state());
const SyncState newSyncState = toSyncState(newState);

const VkImageMemoryBarrier2 barrier{
    .sType         = VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2,
    .srcStageMask  = oldSyncState.stage,
    .srcAccessMask = oldSyncState.access,
    .dstStageMask  = newSyncState.stage,
    .dstAccessMask = newSyncState.access,
    .oldLayout     = oldSyncState.layout,
    .newLayout     = newSyncState.layout,
    .image         = image.handle(),
    // ...
};
vkCmdPipelineBarrier2(commandBuffer.handle(), &dependencyInfo);

image.setState(newState);
```

With synchronization2, stages and access live in the barrier itself, not in the call. That's what lets one small table describe every state.

## One frame of transitions

```cpp
VulkanSync::transitionImage(commandBuffer, image, VulkanResourceState::ColorAttachment);  // before rendering
VulkanSync::transitionImage(commandBuffer, image, VulkanResourceState::Present);          // before present
```

The image keeps its state between frames, so only its very first frame starts from `Unknown`; after that each frame goes `Present` → `ColorAttachment` → `Present`. Two details make this work:

- **`UNDEFINED` as the old layout** of a brand-new image tells the driver its pixels can be thrown away. That's fine, because a brand-new image has nothing worth keeping yet;
- **`Present` uses the color attachment output stage**. Next time the image is acquired, its barrier starts from that stage, the same stage the "image available" semaphore is waited at in the submit. The semaphore and the barrier meet there.

## Checklist

Using:

- `VkImageMemoryBarrier2`, `VkDependencyInfo`, `vkCmdPipelineBarrier2`

Done:

- [x] `VulkanResourceState` → stage, access and layout in one flat `switch`
- [x] `transitionImage()` builds the barrier from the old and new state
- [x] The image's state is updated after every transition
- [x] Present (Unknown the first time) → ColorAttachment → Present every frame

Next: the Vulkan command list.
