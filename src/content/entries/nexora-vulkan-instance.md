---
title: "Nexora #11: Vulkan instance"
type: note
topic: nexora
date: 2026-11-15T20:00:00
tags: [cpp, vulkan, vk-bootstrap]
cover: /images/nexora-vulkan-instance-passport.svg
description: "The first Vulkan object: VkInstance via vk-bootstrap, with validation layers in debug builds."
---

Every Vulkan program starts with a **VkInstance**. It's the connection between the app and the Vulkan loader, and everything else is created from it: the surface, the physical device, the logical device.

## Intro: what the instance does

| Part | Role |
| --- | --- |
| `VkInstance` | Tells the loader who we are and which API version we need |
| Layers | Code between the app and the driver that sees every call |
| Validation layer | A layer that checks each call against the spec and reports misuse |
| Debug messenger | A callback where the validation layer sends its messages |

Vulkan itself checks almost nothing, for speed. A wrong call can crash or silently draw garbage. The **validation layer** is how you find out what went wrong, so it's on in debug builds and off in release.

## vk-bootstrap builder

Creating an instance by hand takes a lot of structs. vk-bootstrap wraps it in a builder:

```cpp
vkb::InstanceBuilder builder;
builder
    .set_app_name("Nexora")     //
    .set_engine_name("Nexora")  //
    .require_api_version(1, 3, 0);

if constexpr (c_isValidationEnabled)
{
    builder
        .request_validation_layers()                                //
        .set_debug_messenger_severity(c_validationMessageSeverity)  //
        .set_debug_callback(/* lambda */);
}

const auto instance = builder.build();
```

`require_api_version(1, 3, 0)` asks for Vulkan 1.3. That version brings dynamic rendering and synchronization2 into core, which the renderer will use later.

`build()` returns a result object. On failure, the engine logs `Fatal` with vk-bootstrap's error message.

## Key parts

**Validation by build type**: the flag is named after what it controls, not after the build:

```cpp
#if defined(NDEBUG)
constexpr bool c_isValidationEnabled = false;
#else
constexpr bool c_isValidationEnabled = true;
#endif
```

**Validation messages go to the engine log**: one flat `switch` maps each Vulkan severity to a log verbosity:

```cpp
case VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT: NX_LOG(LogVulkan, Warning, "{}", message); break;
case VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT: NX_LOG(LogVulkan, Error, "{}", message); break;
```

Verbose and info go to `Log`, so they land in the file but not the console.

**RAII**: the constructor creates, the destructor destroys, in reverse order:

```cpp
VulkanInstance::~VulkanInstance()
{
    vkb::destroy_debug_utils_messenger(m_instance, m_debugMessenger);
    vkDestroyInstance(m_instance, nullptr);
}
```

**No Vulkan in the header**: Vulkan handles are pointers to opaque structs, so the header forward-declares them and stays free of `vulkan.h`:

```cpp
struct VkInstance_T;
struct VkDebugUtilsMessengerEXT_T;
```

## Checklist

Using:

- vk-bootstrap `InstanceBuilder`
- Vulkan 1.3, validation layers, debug utils messenger

Done:

- [x] `VulkanInstance` with RAII
- [x] Validation on in debug, off in release
- [x] Validation messages routed into `LogVulkan`
- [x] Vulkan types kept out of the header

Next: the Vulkan device.
