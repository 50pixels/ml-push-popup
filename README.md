# Push Notification Popup Widget

A modern, iOS-style popup widget designed specifically for MobiLoud mobile apps to prompt users to enable push notifications.

## Features

- 🎨 **Modern Design**: Clean, iOS-style interface with smooth animations
- 📱 **MobiLoud Integration**: Built specifically for MobiLoud app platform
- 🔔 **Real-time Status Monitoring**: Automatically updates UI when push notification status changes
- 🍪 **Session Limiting**: Control how often the popup appears using cookies
- 🎯 **URL Targeting**: Show popup only on specific pages
- 🐛 **Debug Mode**: Test in browsers without app environment
- 🌓 **Dark Mode Support**: Manual dark mode control (disabled by default)
- 🛡️ **CSS Isolation**: All classes prefixed with `ml-` to prevent conflicts

## Installation

Simply include the `script.js` file in your HTML:

```html
<script src="script.js"></script>
```

## Basic Usage

```javascript
// Create and show a basic popup
const popup = createPushPopup({
    heading: "Enable Notifications",
    text: "Stay updated with our latest news and updates.",
    autoTrigger: true,
    delay: 3000 // Show after 3 seconds
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `heading` | string | "Enable Notifications" | Main heading text |
| `text` | string | "Stay updated with our latest news..." | Description text |
| `image` | string | null | Optional image URL (64x64px recommended) |
| `acceptText` | string | "Enable" | Accept button text |
| `declineText` | string | "Not Now" | Decline button text (empty string hides button) |
| `successMessage` | string | "✅ Notifications enabled!..." | Message shown after enabling |
| `autoTrigger` | boolean | false | Automatically show popup on page load (once per session) |
| `delay` | number | 0 | Delay in milliseconds before auto-showing |
| `triggerElement` | string/Element | null | CSS selector or element to trigger popup |
| `allowedUrls` | array | null | URL patterns where popup can show |
| `debugMode` | boolean | false | Enable testing in browsers |
| `maxSessions` | number | null | Maximum times to show popup |
| `timeframeDays` | number | null | Timeframe for session limit (in days) |
| `darkMode` | boolean | false | Enable dark mode styling |
| `onAccept` | function | console.log | Callback when user accepts |
| `onDecline` | function | console.log | Callback when user declines |
| `onClose` | function | console.log | Callback when popup is closed |

## Examples

### 1. Basic Implementation

```javascript
const popup = createPushPopup({
    heading: "Don't Miss Out!",
    text: "Get instant updates about new content and special offers.",
    autoTrigger: true,
    delay: 5000
});
```

### 2. Session Limited Popup

Show popup maximum 3 times in 30 days:

```javascript
const popup = createPushPopup({
    heading: "Enable Notifications",
    text: "Stay connected with important updates.",
    maxSessions: 3,
    timeframeDays: 30,
    autoTrigger: true
});
```

### 3. Single Button (No Decline)

```javascript
const popup = createPushPopup({
    heading: "Important Notice",
    text: "Enable notifications to continue using all features.",
    acceptText: "Enable Now",
    declineText: "", // Empty string removes decline button
    autoTrigger: true
});
```

### 4. URL Targeting

Show only on specific pages:

```javascript
const popup = createPushPopup({
    heading: "Product Updates",
    text: "Get notified about updates to this product.",
    allowedUrls: [
        "/products/*",
        "/shop/*",
        "*/special-offers/*"
    ],
    autoTrigger: true
});
```

### 5. Manual Trigger

Bind to a button or link:

```javascript
const popup = createPushPopup({
    heading: "Enable Notifications",
    text: "Click the bell icon anytime to enable notifications.",
    triggerElement: "#notification-bell",
    debugMode: false
});

// Or trigger programmatically
document.getElementById('my-button').addEventListener('click', () => {
    popup.show();
});
```

### 6. With Callbacks

```javascript
const popup = createPushPopup({
    heading: "Stay Updated",
    text: "Enable push notifications for the best experience.",
    onAccept: () => {
        // Track analytics event
        gtag('event', 'push_notification_accepted', {
            'event_category': 'engagement'
        });
    },
    onDecline: () => {
        // Maybe try again later
        console.log('User declined, will ask again in 7 days');
    },
    onClose: () => {
        // Popup was closed
        console.log('Popup closed');
    }
});
```

### 7. Debug Mode for Testing

```javascript
const popup = createPushPopup({
    heading: "Test Popup",
    text: "This works in any browser for testing.",
    debugMode: true, // Bypasses MobiLoud app checks
    autoTrigger: true
});
```

## MobiLoud Integration

The widget integrates with MobiLoud's native bridge:

1. **App Detection**: Checks if user agent contains "canvas"
2. **Push Status**: Monitors `window.mobiloudAppInfo.pushSubscribed`
3. **Native Prompt**: Calls `nativeFunctions.triggerPushPrompt()`
4. **Status Updates**: Listens to `window.mlPushStatusChanged` callback

## Display Logic

The popup will only show when ALL conditions are met:

1. ✅ User is in MobiLoud app (or debugMode is true)
2. ✅ Push notifications are disabled
3. ✅ Current URL matches allowedUrls (if specified)
4. ✅ Session limit not exceeded (if specified)

## Session Limiting

Control popup frequency with cookies:

```javascript
// Show maximum 2 times per month
const popup = createPushPopup({
    maxSessions: 2,
    timeframeDays: 30,
    autoTrigger: true
});
```

The widget stores a cookie (`ml_push_popup_tracking`) with:
- `count`: Number of times shown
- `firstShown`: Timestamp of first display

## Styling

All CSS classes are prefixed with `ml-` to prevent conflicts:

- `.ml-push-popup-overlay` - Background overlay
- `.ml-push-popup` - Main popup container
- `.ml-push-popup-close` - Close button
- `.ml-push-popup-content` - Content wrapper
- `.ml-push-popup-heading` - Heading text
- `.ml-push-popup-image` - Optional image
- `.ml-push-popup-text` - Description text
- `.ml-push-popup-buttons` - Button container
- `.ml-push-popup-accept` - Accept button
- `.ml-push-popup-decline` - Decline button
- `.ml-push-popup-success` - Success message

## API Reference

### Global Function

```javascript
window.createPushPopup(options)
```

Creates and returns a new `PushNotificationPopup` instance.

### Instance Methods

#### `show()`
Manually show the popup:
```javascript
popup.show();
```

#### `hide()`
Manually hide the popup:
```javascript
popup.hide();
```

#### `destroy()`
Remove popup and clean up resources:
```javascript
popup.destroy();
```

## Auto-initialization

Set configuration before loading the script:

```javascript
window.pushPopupConfig = {
    heading: "Enable Notifications",
    autoTrigger: true,
    delay: 5000
};
```
```html
<script src="script.js"></script>
```

The popup will be available as `window.pushPopup`.

## Browser Compatibility

- Chrome/Edge: Full support
- Safari: Full support
- Firefox: Full support
- MobiLoud WebView: Optimized

## Testing

Use debug mode for browser testing:

```javascript
const popup = createPushPopup({
    debugMode: true, // Bypasses all app checks
    autoTrigger: true
});
```

## Troubleshooting

### Popup not showing?

1. Check browser console for errors
2. Verify you're in MobiLoud app (or using debugMode)
3. Ensure push notifications are disabled
4. Check URL matches allowedUrls pattern
5. Verify session limits haven't been exceeded

### Cookies not working?

- Cookies require HTTP/HTTPS protocol
- Won't work with `file://` URLs
- Check browser privacy settings

### Style conflicts?

All classes are prefixed with `ml-` to prevent conflicts. If issues persist, increase CSS specificity or use `!important`.

## License

This widget is designed for use with MobiLoud mobile apps. Please refer to your MobiLoud license agreement for usage terms.

## How It Works

### Push Notification Status Detection

The widget checks if push notifications are enabled by:

1. **Reading MobiLoud App Info**: The widget checks `window.mobiloudAppInfo.pushSubscribed`
   - `true` = Push notifications are enabled
   - `false` or `undefined` = Push notifications are disabled

2. **Real-time Monitoring**: The widget monitors push status changes in two ways:
   - **Callback Method**: Listens to `window.mlPushStatusChanged(isSubscribed)` callback
   - **Polling Backup**: Checks status every second as a fallback mechanism

### Initial Status Check on Page Load

When the page loads, the widget performs these checks in order:

1. **URL Check**: Verifies if current URL matches `allowedUrls` patterns (if specified)
2. **App Context Check**: Confirms user is in MobiLoud app (user agent contains "canvas")
3. **Push Status Check**: Reads `window.mobiloudAppInfo.pushSubscribed`
4. **Session Limit Check**: Verifies popup hasn't exceeded display limits

If all checks pass, the popup is initialized and ready to show.

### App Detection

The widget determines if it's running in a MobiLoud app by:

```javascript
navigator.userAgent.toLowerCase().includes('canvas')
```

This check ensures the popup only appears in the MobiLoud WebView, not in regular browsers (unless `debugMode: true`).

### Session Tracking

#### Auto-trigger Session Control

When `autoTrigger: true`, the popup will only show **once per page session** automatically. This prevents annoying repeated popups if the trigger conditions are met multiple times during a single page visit.

- First auto-trigger: Shows normally
- Subsequent auto-triggers: Blocked with console message
- Manual triggers: Always allowed (via button clicks or `popup.show()`)

#### Cookie-based Session Limiting

For longer-term control across page reloads, use `maxSessions` and `timeframeDays`:

```javascript
// Cookie structure stored as 'ml_push_popup_tracking':
{
    count: 2,              // Times shown
    firstShown: 1234567890 // Timestamp of first display
}
```

**Session limit logic:**
1. First display: Creates cookie with count=1 and current timestamp
2. Subsequent displays: Increments count if within timeframe
3. Outside timeframe: Resets count to 1 with new timestamp
4. At limit: Popup won't show until timeframe expires

### Push Subscription Flow

1. **User Clicks Enable**: Triggers `onAccept` callback
2. **Native Bridge Call**: Executes `nativeFunctions.triggerPushPrompt()`
3. **OS Permission Dialog**: Native iOS/Android permission prompt appears
4. **Status Update**: MobiLoud updates `window.mobiloudAppInfo.pushSubscribed`
5. **UI Update**: Widget detects change and shows success message
6. **Manual Close Required**: User must tap X or outside to dismiss

### Dark Mode Control

By default, the widget uses light mode styling. To enable dark mode:

```javascript
const popup = createPushPopup({
    darkMode: true,  // Force dark mode
    // other options...
});
```

Note: The widget no longer automatically adapts to system theme preferences. Dark mode must be explicitly enabled via the `darkMode` option.

## Support

For support with this widget, please contact MobiLoud support or refer to the MobiLoud documentation.