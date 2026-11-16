---
title: "Nexora #12: Vulkan device"
type: note
topic: nexora
date: 2026-11-15T21:00:00
tags: [cpp, vulkan]
cover: /images/nexora-vulkan-device.svg
description: "VulkanDevice: pick a GPU, turn on the Vulkan 1.3 features the renderer needs, and create the logical device with one graphics queue."
---

The instance tells the loader who we are. The **device** is where the real work happens: every buffer, image, pipeline and command pool is created from it.

## Intro: two kinds of device

| Part | Role |
| --- | --- |
| `VkPhysicalDevice` | A real GPU in the machine. Not created, only enumerated and queried |
| `VkDevice` | The logical device: our connection to that GPU, with the features and queues we asked for |
| Queue family | A group of queues on the GPU with the same abilities |
| Extension | Optional functionality that has to be turned on, e.g. the swapchain |

One physical device can back several logical devices. Nexora needs exactly one of each.

## Picking the GPU

The rule is simple: the **first discrete GPU with Vulkan 1.3**. If there is none, the engine can't run, so it logs `Fatal`:

```cpp
for (const VkPhysicalDevice physicalDevice : physicalDevices)
{
    VkPhysicalDeviceProperties properties{};
    vkGetPhysicalDeviceProperties(physicalDevice, &properties);
    if (properties.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU && properties.apiVersion >= VK_API_VERSION_1_3)
    {
        NX_LOG(LogVulkan, Display, "Vulkan device selected: {}", properties.deviceName);
        return physicalDevice;
    }
}
```

No scoring and no fallback to an integrated GPU: that's for later, when a machine actually needs it.

The graphics queue family is found the same way: the first family with `VK_QUEUE_GRAPHICS_BIT`.

## Creating the logical device

Unlike the instance, the device is created with plain Vulkan, no vk-bootstrap. There are only three things to fill in:

- **one queue** from the graphics family, priority `1.0`;
- **Vulkan 1.3 features**: `synchronization2` for the new submit and barriers, `dynamicRendering` for drawing without render pass objects;
- **one extension**: `VK_KHR_swapchain`, so images can be shown in a window.

```cpp
const VkPhysicalDeviceVulkan13Features features13{
    .sType            = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES,
    .synchronization2 = VK_TRUE,
    .dynamicRendering = VK_TRUE,
};
const char* const        swapchainExtension = VK_KHR_SWAPCHAIN_EXTENSION_NAME;
const VkDeviceCreateInfo deviceInfo{
    .sType                   = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
    .pNext                   = &features13,
    .queueCreateInfoCount    = 1,
    .pQueueCreateInfos       = &queueInfo,
    .enabledExtensionCount   = 1,
    .ppEnabledExtensionNames = &swapchainExtension,
};
NX_VULKAN_CHECK(vkCreateDevice(m_physicalDevice, &deviceInfo, nullptr, &m_logicalDevice));
```

Features are passed through the `pNext` chain: Vulkan extends structs by linking new ones to them instead of changing the old ones.

## Key parts

**Helpers stay in the `.cpp`**: `selectPhysicalDevice()` and `findGraphicsQueueFamilyIndex()` live in an anonymous namespace. The header doesn't grow, and the class keeps only what it owns.

**Two handles, two names**: the type holds two raw handles, so each getter names its own instead of a vague `handle()`:

```cpp
VkPhysicalDevice_T* physicalDevice() const;
VkDevice_T*         logicalDevice() const;
const VulkanQueue&  graphicsQueue() const;
```

**The queue comes right after the device**: it can only be taken from a created device, so it's a `std::unique_ptr` made in the constructor body:

```cpp
m_graphicsQueue = std::make_unique<VulkanQueue>(m_logicalDevice, graphicsQueueFamilyIndex);
```

**RAII**: the destructor destroys the logical device. The physical device is never created, so there is nothing to destroy.

## Checklist

Using:

- `vkEnumeratePhysicalDevices`, `vkGetPhysicalDeviceQueueFamilyProperties`, `vkCreateDevice`
- Vulkan 1.3 features: synchronization2, dynamic rendering
- `VK_KHR_swapchain`

Done:

- [x] First discrete GPU with Vulkan 1.3, `Fatal` if none
- [x] Logical device with one graphics queue
- [x] Features and extension the renderer needs
- [x] Vulkan types kept out of the header

Next: the Vulkan queue.
