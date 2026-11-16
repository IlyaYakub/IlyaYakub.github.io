---
title: "Vulkan sync: fences, semaphores and barriers"
type: note
topic: vulkan
date: 2026-11-16T17:00:00
tags: [vulkan, sync, gpu]
cover: /images/vulkan-sync/cover-lanes.svg
description: "How synchronization works in Vulkan, with animated pictures: who waits for whom, and which tool to use for each case."
---

In OpenGL the driver kept everything in order for you. Vulkan doesn't: it does exactly what you ask and nothing more. That is where the speed comes from, and also where most of the bugs come from. This note puts the three main tools side by side: **fences**, **semaphores** and **barriers**.

## Everything runs at once

![CPU and GPU timelines running in parallel](/images/vulkan-sync/async.svg)

Three things happen in parallel:

- the **CPU** records the next frame while the GPU is still drawing the last one;
- the **GPU** starts commands in the order they were submitted, but they **overlap** in the pipeline and can finish in any order;
- each GPU unit has its own **caches**, so data written by one unit isn't automatically seen by another.

Synchronization is just saying who has to wait for whom.

## The map

![Where fences, semaphores and barriers sit](/images/vulkan-sync/map.svg)

| Tool | Who waits | For what | Scope |
| --- | --- | --- | --- |
| Fence | CPU | a submit to finish | GPU → CPU |
| Binary semaphore | GPU | another queue operation | GPU → GPU |
| Timeline semaphore | GPU or CPU | a counter to reach a value | both |
| Pipeline barrier | GPU | earlier commands in the same queue | inside a queue |

The rule of thumb: if the CPU waits, it's a fence. If one queue operation waits for another, it's a semaphore. If one command waits for another, it's a barrier.

## The hammer: wait idle

```cpp
vkQueueWaitIdle(queue);   // wait until this queue has nothing left to do
vkDeviceWaitIdle(device); // wait until the whole GPU is idle
```

It always works, and it's always slow: the CPU and the GPU take turns instead of working in parallel. It's fine at shutdown or when recreating a swapchain. In the frame loop, use the tools below.

## Fence: the CPU waits for the GPU

![The CPU waits on a fence while the GPU finishes a frame](/images/vulkan-sync/fence.svg)

A fence has two states. The GPU **signals** it when a submit is done, and the CPU **waits** on it and **resets** it:

```cpp
const VkFenceCreateInfo fenceInfo{
    .sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO,
    .flags = VK_FENCE_CREATE_SIGNALED_BIT,  // so the first wait passes
};

vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
vkResetFences(device, 1, &fence);
// ... record the command buffer again ...
vkQueueSubmit2(queue, 1, &submitInfo, fence);
```

The classic use is **frames in flight**: each frame has its own command buffer and fence. Before recording frame N again, the CPU waits on its fence. That guarantees the GPU has finished reading the buffer, and that the CPU never gets more than two frames ahead.

## Binary semaphore: one GPU step waits for another

![A semaphore passes from acquire to submit to present](/images/vulkan-sync/semaphore.svg)

A semaphore orders **queue operations** (acquire, submit, present) without the CPU. One operation signals it, another waits on it, and the wait unsignals it again.

With synchronization2 each semaphore in a submit gets a **stage**: the place in the pipeline where the wait applies.

```cpp
const VkSemaphoreSubmitInfo waitInfo{
    .sType     = VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO,
    .semaphore = imageAvailable,
    .stageMask = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT,
};
const VkSemaphoreSubmitInfo signalInfo{
    .sType     = VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO,
    .semaphore = renderFinished,
    .stageMask = VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT,
};
```

Waiting at `COLOR_ATTACHMENT_OUTPUT` means that vertex and fragment work can start before the swapchain image is free. Only writing the color has to wait.

Two rules for binary semaphores: every wait needs a signal that was submitted before it, and one signal feeds exactly one wait.

## Timeline semaphore: a counter

![A timeline semaphore counter and its waiters](/images/vulkan-sync/timeline.svg)

Since Vulkan 1.2 a semaphore can be a **64-bit counter** that only goes up. A submit signals a value, and anyone waits until the counter **reaches** a value. That includes the CPU:

```cpp
const VkSemaphoreTypeCreateInfo typeInfo{
    .sType         = VK_STRUCTURE_TYPE_SEMAPHORE_TYPE_CREATE_INFO,
    .semaphoreType = VK_SEMAPHORE_TYPE_TIMELINE,
    .initialValue  = 0,
};

// in a submit: signal the value 2 when this job is done
const VkSemaphoreSubmitInfo signalInfo{
    .sType     = VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO,
    .semaphore = timeline,
    .value     = 2,
};

// on the CPU: wait until the counter is at least 3
const uint64_t            value = 3;
const VkSemaphoreWaitInfo waitInfo{
    .sType          = VK_STRUCTURE_TYPE_SEMAPHORE_WAIT_INFO,
    .semaphoreCount = 1,
    .pSemaphores    = &timeline,
    .pValues        = &value,
};
vkWaitSemaphores(device, &waitInfo, UINT64_MAX);
```

One timeline semaphore can replace a set of binary semaphores and fences, which makes it great for job graphs. The swapchain is the exception: acquire and present still take only binary semaphores.

## Pipeline barrier

A barrier works **inside a queue**. It splits the commands into "before" and "after" in submission order and says what "after" must wait for. It does three separate jobs.

### 1. Execution dependency: wait for the work

![Execution barrier: B waits for A only at the fragment stage](/images/vulkan-sync/execution-barrier.svg)

- **`srcStageMask`**: the stages of earlier commands that must finish;
- **`dstStageMask`**: the stages of later commands that must wait.

Everything outside these two scopes keeps running. Above, B's vertex shader runs right away. B stops only before the fragment shader, until A has finished writing color. Precise stage masks keep the GPU busy, while `ALL_COMMANDS` on both sides drains the whole pipeline.

### 2. Memory dependency: see the data

![Memory barrier: data moves from the writer's cache to the reader's](/images/vulkan-sync/memory.svg)

Finishing the work isn't enough. The written data may still sit in the writer's cache, and the reader may still hold an old copy in its own. So a barrier also says:

- **`srcAccessMask`**: which writes to make **available** (flush them out);
- **`dstAccessMask`**: which reads to make that data **visible** to (invalidate the stale copies).

A stage without an access mask is a pure execution dependency. That's enough for read-after-read, but never for anything after a write.

### 3. Layout transition: arrange the pixels

![Layout transition: the same pixels reordered for the next use](/images/vulkan-sync/layout.svg)

Images also have a **layout**: the way the pixels are arranged in memory, chosen for one kind of use. An image barrier moves the image from `oldLayout` to `newLayout`, between making the data available and making it visible. `UNDEFINED` as the old layout means "I don't need the old contents", which is cheaper.

### All three in one call

Render into an image, then sample it in the next pass. That's the example from the pictures above:

```cpp
const VkImageMemoryBarrier2 barrier{
    .sType = VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2,

    // after A has written color, make those writes available
    .srcStageMask  = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT,
    .srcAccessMask = VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT,

    // before B's fragment shader, make them visible to sampling
    .dstStageMask  = VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT,
    .dstAccessMask = VK_ACCESS_2_SHADER_SAMPLED_READ_BIT,

    // and rearrange the pixels on the way
    .oldLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
    .newLayout = VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL,

    .image            = image,
    .subresourceRange = {
        .aspectMask = VK_IMAGE_ASPECT_COLOR_BIT,
        .levelCount = 1,
        .layerCount = 1,
    },
};
const VkDependencyInfo dependencyInfo{
    .sType                   = VK_STRUCTURE_TYPE_DEPENDENCY_INFO,
    .imageMemoryBarrierCount = 1,
    .pImageMemoryBarriers    = &barrier,
};
vkCmdPipelineBarrier2(commandBuffer, &dependencyInfo);
```

## Recipes

The four pairs that come up all the time (stage, then access):

```text
texture upload, then sample
  src     COPY                      TRANSFER_WRITE
  dst     FRAGMENT_SHADER           SHADER_SAMPLED_READ
  layout  TRANSFER_DST -> SHADER_READ_ONLY

render to texture, then sample
  src     COLOR_ATTACHMENT_OUTPUT   COLOR_ATTACHMENT_WRITE
  dst     FRAGMENT_SHADER           SHADER_SAMPLED_READ
  layout  COLOR_ATTACHMENT -> SHADER_READ_ONLY

swapchain image, before present
  src     COLOR_ATTACHMENT_OUTPUT   COLOR_ATTACHMENT_WRITE
  dst     NONE                      NONE   (the semaphore takes over)
  layout  COLOR_ATTACHMENT -> PRESENT_SRC

compute writes vertices, then draw
  src     COMPUTE_SHADER            SHADER_STORAGE_WRITE
  dst     VERTEX_ATTRIBUTE_INPUT    VERTEX_ATTRIBUTE_READ
  layout  none, it's a buffer
```

## Events: a split barrier

An **event** is a barrier cut in two: `vkCmdSetEvent2` where the work is done, and `vkCmdWaitEvents2` where it's needed. Commands recorded between the two calls don't wait at all. It's useful when there's independent work to fill the gap. In most code a plain barrier is enough.

## How to not get it wrong

- **Start coarse, then narrow down.** A correct barrier with broad masks beats a fast one with a bug.
- **Turn on synchronization validation** in the validation layer, for example through Vulkan Configurator. It finds missing barriers and hazards that the regular validation can't see.
- **Think in pairs:** for every resource, who wrote it last, and who reads it next. That pair is your src and dst.

In Nexora this all shows up in a few small classes: [VulkanFence](/e/nexora-vulkan-fence), [VulkanSemaphore](/e/nexora-vulkan-semaphore) and [VulkanSync](/e/nexora-vulkan-sync).

Reference: TU Wien, [Vulkan Lecture Series, Ep. 7: Vulkan Synchronization](https://www.youtube.com/results?search_query=Vulkan+Lecture+Series+Ep.+7+Synchronization) by Johannes Unterguggenberger. It goes deeper into the theory, including subpass dependencies, which are left out here because Nexora uses dynamic rendering.
