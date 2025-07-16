# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a push notification popup widget designed specifically for MobiLoud mobile apps. The widget creates a modern, iOS-style popup that prompts users to enable push notifications when they're disabled.

## Architecture

The project consists of three main files:

- **script.js**: Core widget implementation as a JavaScript class (`PushNotificationPopup`)
- **widget.html**: Demo page with multiple configuration examples
- **style.css**: Demo page styling (widget styles are embedded in script.js)

### Key Components

**PushNotificationPopup Class** (`script.js:15-608`):
- Self-contained widget with embedded CSS styles
- Handles MobiLoud app detection via user agent "canvas" check
- Monitors push notification status via `window.mobiloudAppInfo.pushSubscribed`
- Integrates with native bridge via `nativeFunctions.triggerPushPrompt()`
- Supports real-time status updates via `window.mlPushStatusChanged` callback

**Detection Logic**:
- App context: User agent contains "canvas" (case-insensitive)
- Push status: `window.mobiloudAppInfo.pushSubscribed` boolean
- Only shows popup when in app AND push is disabled (unless debug mode)

**Global API**:
- `window.createPushPopup(options)` - Main factory function
- Auto-initialization via `window.pushPopupConfig` if present

## Configuration Options

The widget accepts these configuration options:

- `heading`: Popup title text
- `text`: Description text
- `acceptText`/`declineText`: Button labels
- `successMessage`: Message shown after enabling
- `autoTrigger`: Auto-show on page load (default: false)
- `delay`: Delay before auto-trigger (ms)
- `triggerElement`: CSS selector for manual trigger
- `allowedUrls`: Array of URL patterns where popup can show
- `debugMode`: Bypass app/push checks for testing
- `onAccept`/`onDecline`/`onClose`: Callback functions

## Testing

The widget includes comprehensive debug capabilities:
- Set `debugMode: true` to bypass all app and push status checks
- Demo page (widget.html) provides multiple test scenarios
- Debug mode simulates push acceptance for browser testing

## MobiLoud Integration

The widget is specifically designed for MobiLoud mobile apps and relies on:
- MobiLoud user agent detection
- Native bridge functions for push prompts
- Real-time status monitoring via global callbacks

For production use, the widget should be deployed within a MobiLoud app context where these native functions are available.

## Rules to follow

1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the [todo.md](http://todo.md/) file with a summary of the changes you made and any other relevant information.