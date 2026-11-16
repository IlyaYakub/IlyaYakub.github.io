---
title: "Nexora #18: Vulkan image"
type: note
topic: nexora
date: 2026-11-16T15:00:00
tags: [cpp, vulkan, rhi]
cover: /images/nexora-vulkan-image-gallery.svg
description: "VulkanImage: the RHI texture on the Vulkan side. An image, a view on it, and the state it's in."
---

Everything the GPU draws into or reads from is an **image**: swapchain images, render targets, textures. `VulkanImage` is the first resource type of the RHI, and for now it wraps the swapchain images.

## Intro: image, view, state

| Part | Role |
| --- | --- |
| `VkImage` | The pixels in GPU memory: size, format, layout |
| `VkImageView` | How to look at the image: which format, which mips and layers |
| Layout / state | How the pixels are arranged right now, e.g. for rendering or for presenting |
| `IRHITexture` | The RHI interface the renderer sees, with no Vulkan in it |

The image is the canvas, and the view is the lens you look at it through. Most Vulkan calls want the view, while barriers want the image itself.

## The RHI side

The renderer must not know about Vulkan, so it works with `IRHITexture`. For now the interface is empty: it only gives the type a name across the RHI boundary:

```cpp
class IRHITexture : public NonCopyable
{
public:
    virtual ~IRHITexture() = default;
};
```

`VulkanImage` is its `final` implementation. A command list that gets an `IRHITexture&` casts it back, because inside the Vulkan RHI every texture is a `VulkanImage`:

```cpp
VulkanImage& image = static_cast<VulkanImage&>(texture);
```

## Borrowed images

`VulkanImage` doesn't create anything. It takes handles that already exist, together with a **type** that says who owns the pixels:

```cpp
enum class VulkanImageType : uint8
{
    Unknown,
    Swapchain,
};
```

Swapchain images belong to the swapchain: `vkDestroySwapchainKHR` frees them. Their views belong to us. So the destructor always destroys the view, and the image only if it's not a swapchain image:

```cpp
VulkanImage::~VulkanImage()
{
    const VkDevice logicalDevice = m_device.logicalDevice();

    vkDestroyImageView(logicalDevice, m_view, nullptr);
    if (m_type != VulkanImageType::Swapchain)
    {
        vkDestroyImage(logicalDevice, m_image, nullptr);
    }
}
```

The swapchain wraps each of its images this way:

```cpp
const VulkanImageSettings imageSettings{
    .image  = images[i],
    .view   = imageViews[i],
    .width  = swapchain->extent.width,
    .height = swapchain->extent.height,
    .type   = VulkanImageType::Swapchain,
};
m_images.push_back(std::make_unique<VulkanImage>(m_device, imageSettings));
```

## The state it's in

An image has to be in the right layout for each use, and switching layouts needs a barrier. To build a barrier you need to know the **old** layout, so the image remembers its state:

```cpp
enum class VulkanResourceState : uint8
{
    Unknown,
    ColorAttachment,
    Present,
};
```

Only the states the engine actually uses: `ColorAttachment` for rendering into, `Present` for showing in the window. A new swapchain image starts as `Unknown`. The barriers that move an image between states come in the next note.

## Checklist

Using:

- `VkImage`, `VkImageView`, `vkDestroyImageView` / `vkDestroyImage`

Done:

- [x] `IRHITexture` as the RHI-side type
- [x] `VulkanImage` wrapping an image and its view
- [x] Swapchain images are borrowed: only the view is destroyed
- [x] The current state is tracked for barriers

Next: Vulkan sync.
