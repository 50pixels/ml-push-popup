/**
 * Push Notification Popup Widget - v2.2
 * A minimal, modern popup for prompting push notification permissions
 * Integrated with MobiLoud app platform
 * 
 * Features:
 * - Manual initialization (no auto-initialization)
 * - Auto-trigger session control (shows only once per page session)
 * - Manual dark mode control
 * - Real-time push status monitoring
 * - Cookie-based session limiting
 * - Google Analytics integration (recommended)
 * 
 * Usage:
 * const popup = createPushPopup({
 *     heading: "Enable Notifications",
 *     text: "Stay updated with our latest news.",
 *     enableAnalytics: true,
 *     autoTrigger: true,
 *     darkMode: false,
 *     debugMode: false // Set to true for browser testing
 * });
 */

class PushNotificationPopup {
    // Track style usage count
    static styleUsageCount = 0;
    
    // Track if any popup is currently visible globally
    static currentlyVisible = false;

    constructor(options = {}) {
        this.options = {
            heading: options.heading || "Enable Notifications",
            image: options.image || null,
            text: options.text || "Stay updated with our latest news and updates. We'll send you relevant notifications.",
            acceptText: options.acceptText || "Enable",
            declineText: options.declineText !== undefined ? options.declineText : "Not Now",
            successMessage: options.successMessage || "✅ Notifications enabled! You're all set.",
            onAccept: options.onAccept || (() => console.log('Accepted')),
            onDecline: options.onDecline || (() => console.log('Declined')),
            onClose: options.onClose || (() => console.log('Closed')),
            autoTrigger: options.autoTrigger || false,
            triggerElement: options.triggerElement || null,
            delay: options.delay || 0,
            allowedUrls: options.allowedUrls || null,
            debugMode: options.debugMode || false,
            maxSessions: options.maxSessions || null,
            timeframeDays: options.timeframeDays || null,
            darkMode: options.darkMode || false,
            enableAnalytics: options.enableAnalytics || false
        };

        this.isVisible = false;
        this.overlay = null;
        this.popup = null;
        this.currentPushStatus = null;
        this.statusCheckInterval = null;
        this._onOverlayClick = null;
        this._onKeyDown = null;
        this._originalPushCallback = null;
        this.cookieName = 'ml_push_popup_tracking';
        this.hasAutoTriggeredThisSession = false;

        this.init();
    }

    trackEvent(eventName, customParameters = {}) {
        if (!this.options.enableAnalytics) {
            return;
        }

        try {
            // Check if gtag is available
            if (typeof window.gtag !== 'function') {
                if (this.options.debugMode) {
                    console.warn('[PushPopup Analytics] Google Analytics (gtag) not available - event not tracked:', eventName);
                }
                return;
            }

            // Ensure event name has ml_ prefix
            const prefixedEventName = eventName.startsWith('ml_') ? eventName : `ml_${eventName}`;

            // Standard event parameters
            const standardParameters = {
                event_category: 'engagement',
                event_label: 'push_notification_popup',
                page_url: window.location.href,
                page_title: document.title,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            // Merge custom parameters with standard ones
            const eventParameters = { ...standardParameters, ...customParameters };

            // Track the event
            window.gtag('event', prefixedEventName, eventParameters);

            if (this.options.debugMode) {
                console.log('[PushPopup Analytics] Event tracked:', {
                    event: prefixedEventName,
                    parameters: eventParameters
                });
            }

        } catch (error) {
            if (this.options.debugMode) {
                console.error('[PushPopup Analytics] Error tracking event:', eventName, error);
            }
        }
    }

    init() {
        // Check if current URL is allowed
        if (!this.isUrlAllowed()) {
            return; // Don't initialize if URL is not in allowed list
        }

        // Check if should show popup (app context + push disabled, unless debug mode)
        if (!this.shouldShowPopup()) {
            return; // Don't initialize if conditions aren't met
        }

        this.createStyles();
        this.createPopup();
        this.bindEvents();
        this.setupPushStatusMonitoring();

        // Auto-trigger if enabled
        if (this.options.autoTrigger) {
            setTimeout(() => this.show(true), this.options.delay);
        }

        // Bind to trigger element if provided
        if (this.options.triggerElement) {
            const element = typeof this.options.triggerElement === 'string' 
                ? document.querySelector(this.options.triggerElement)
                : this.options.triggerElement;
            
            if (element) {
                element.addEventListener('click', () => this.show());
            }
        }
    }

    isInApp() {
        // Check if user agent contains "canvas" (case insensitive)
        return navigator.userAgent.toLowerCase().includes('canvas');
    }

    isPushEnabled() {
        try {
            // Check MobiLoud push notification status
            return !!(window.mobiloudAppInfo && window.mobiloudAppInfo.pushSubscribed);
        } catch (e) {
            // If can't determine status, assume disabled
            return false;
        }
    }

    shouldShowPopup() {
        // In debug mode, bypass all checks
        if (this.options.debugMode) {
            console.log('[PushPopup Debug] Debug mode enabled - bypassing app and push checks');
            return true;
        }

        // Check if user is in the app
        if (!this.isInApp()) {
            console.log('[PushPopup] Not in app context - popup will not show');
            return false;
        }

        // Check if push notifications are already enabled
        if (this.isPushEnabled()) {
            console.log('[PushPopup] Push notifications already enabled - popup will not show');
            return false;
        }

        // Check session limits if configured
        if (this.options.maxSessions !== null && this.options.timeframeDays !== null) {
            if (!this.shouldShowBasedOnLimits()) {
                console.log('[PushPopup] Session limit reached - popup will not show');
                return false;
            }
        }

        return true;
    }

    getCookieData() {
        try {
            const cookieValue = document.cookie
                .split('; ')
                .find(row => row.startsWith(this.cookieName + '='));
            
            if (!cookieValue) {
                return { count: 0, firstShown: null };
            }
            
            const data = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
            return data;
        } catch (e) {
            return { count: 0, firstShown: null };
        }
    }

    setCookieData(data) {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry
        const cookieValue = encodeURIComponent(JSON.stringify(data));
        document.cookie = `${this.cookieName}=${cookieValue}; expires=${expires.toUTCString()}; path=/`;
    }

    shouldShowBasedOnLimits() {
        const data = this.getCookieData();
        const now = new Date().getTime();
        
        // If no previous data, allow showing
        if (!data.firstShown) {
            return true;
        }
        
        const daysSinceFirst = (now - data.firstShown) / (1000 * 60 * 60 * 24);
        
        // If outside timeframe, reset count
        if (daysSinceFirst > this.options.timeframeDays) {
            this.setCookieData({ count: 0, firstShown: now });
            return true;
        }
        
        // Check if under the limit
        return data.count < this.options.maxSessions;
    }

    incrementSessionCount() {
        if (this.options.maxSessions === null || this.options.timeframeDays === null) {
            return;
        }
        
        const data = this.getCookieData();
        const now = new Date().getTime();
        
        if (!data.firstShown) {
            // First time showing
            this.setCookieData({ count: 1, firstShown: now });
        } else {
            const daysSinceFirst = (now - data.firstShown) / (1000 * 60 * 60 * 24);
            
            if (daysSinceFirst > this.options.timeframeDays) {
                // Reset timeframe
                this.setCookieData({ count: 1, firstShown: now });
            } else {
                // Increment count
                this.setCookieData({ count: data.count + 1, firstShown: data.firstShown });
            }
        }
    }

    setupPushStatusMonitoring() {
        // Set up real-time push status monitoring
        this.currentPushStatus = this.isPushEnabled();

        // Store original callback for cleanup
        this._originalPushCallback = window.mlPushStatusChanged;
        
        // Override the global push status change callback
        window.mlPushStatusChanged = (isSubscribed) => {
            // Call original callback if it existed
            if (typeof this._originalPushCallback === 'function') {
                this._originalPushCallback(isSubscribed);
            }

            // Update our status and UI
            this.currentPushStatus = isSubscribed;
            this.updateUIForPushStatus(isSubscribed);
        };

        // Poll for status changes as backup (in case callback doesn't fire)
        this.statusCheckInterval = setInterval(() => {
            const newStatus = this.isPushEnabled();
            if (newStatus !== this.currentPushStatus) {
                this.currentPushStatus = newStatus;
                this.updateUIForPushStatus(newStatus);
            }
        }, 1000);
    }

    updateUIForPushStatus(isEnabled) {
        if (!this.popup) return;

        const buttonsContainer = this.popup.querySelector('.ml-push-popup-buttons');
        const acceptBtn = this.popup.querySelector('.ml-push-popup-accept');

        if (isEnabled && buttonsContainer && acceptBtn) {
            // Track that notifications were successfully enabled
            this.trackEvent('ml_notifications_enabled', {
                event_category: 'conversion',
                value: 1
            });
            
            // Replace buttons with success message
            buttonsContainer.innerHTML = `
                <div class="ml-push-popup-success">
                    ${this.options.successMessage}
                </div>
            `;

            // Note: Removed auto-hide - user must manually close the popup
        }
    }

    isUrlAllowed() {
        // If no URL restrictions specified, allow all URLs
        if (!this.options.allowedUrls) {
            return true;
        }

        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;
        const allowedUrls = Array.isArray(this.options.allowedUrls) 
            ? this.options.allowedUrls 
            : [this.options.allowedUrls];

        return allowedUrls.some(pattern => {
            // Exact match
            if (pattern === currentUrl || pattern === currentPath) {
                return true;
            }

            // Wildcard matching (* = any characters)
            if (pattern.includes('*')) {
                const regexPattern = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
                    .replace(/\*/g, '.*'); // Convert * to .*
                const regex = new RegExp(`^${regexPattern}$`, 'i');
                return regex.test(currentUrl) || regex.test(currentPath);
            }

            // Regex pattern (if it starts and ends with /)
            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                const regexPattern = pattern.slice(1, -1);
                const regex = new RegExp(regexPattern, 'i');
                return regex.test(currentUrl) || regex.test(currentPath);
            }

            // Partial match (contains)
            return currentUrl.includes(pattern) || currentPath.includes(pattern);
        });
    }

    createStyles() {
        if (!document.getElementById('ml-push-popup-styles')) {
            const styles = `
            .ml-push-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }

            .ml-push-popup-overlay.ml-visible {
                opacity: 1;
                pointer-events: all;
            }

            .ml-push-popup {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                border-radius: 20px 20px 0 0;
                padding: 24px;
                box-shadow: none; /* No shadow when hidden */
                transform: translateY(100%);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 500px;
                margin: 0 auto;
                z-index: 10001;
            }
            
            .ml-push-popup.ml-dark-mode {
                background: #2c2c2e;
            }

            .ml-push-popup.ml-visible {
                transform: translateY(0);
                box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15); /* Shadow only when visible */
            }

            .ml-push-popup-close {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 32px;
                height: 32px;
                min-width: 32px; /* Ensure minimum width for perfect circle */
                min-height: 32px; /* Ensure minimum height for perfect circle */
                border: none;
                background: #f5f5f5;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                color: #666;
                transition: all 0.2s ease;
                box-sizing: border-box;
                padding: 0;
                line-height: 1;
                /* Mobile-specific properties */
                -webkit-appearance: none;
                -webkit-tap-highlight-color: transparent;
                -webkit-user-select: none;
                user-select: none;
            }
            
            .ml-dark-mode .ml-push-popup-close {
                background: #48484a;
                color: #a1a1a6;
            }

            .ml-push-popup-close:hover {
                background: #e5e5e5;
                transform: scale(1.1);
            }
            
            .ml-dark-mode .ml-push-popup-close:hover {
                background: #5a5a5c;
            }

            .ml-push-popup-content {
                text-align: center;
                padding-top: 12px;
            }

            .ml-push-popup-heading {
                font-size: 22px;
                font-weight: 600;
                color: #1a1a1a;
                margin: 0 0 16px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .ml-dark-mode .ml-push-popup-heading {
                color: white;
            }

            .ml-push-popup-image {
                width: 64px;
                height: 64px;
                margin: 0 auto 16px auto;
                border-radius: 12px;
                object-fit: cover;
            }

            .ml-push-popup-text {
                font-size: 16px;
                line-height: 1.5;
                color: #666;
                margin: 0 0 24px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .ml-dark-mode .ml-push-popup-text {
                color: #a1a1a6;
            }

            .ml-push-popup-buttons {
                display: flex;
                gap: 12px;
                flex-direction: column;
            }

            .ml-push-popup-button {
                /* Flexbox centering for reliable text alignment */
                display: flex;
                align-items: center;
                justify-content: center;
                
                /* Fixed height instead of padding-only approach */
                height: 56px;
                padding: 0 24px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                
                /* CSS reset properties to override conflicts */
                line-height: 1;
                vertical-align: middle;
                text-align: center;
                box-sizing: border-box;
                
                /* Mobile-specific webkit properties */
                -webkit-appearance: none;
                -webkit-tap-highlight-color: transparent;
                -webkit-user-select: none;
                user-select: none;
            }

            .ml-push-popup-accept {
                background: #007AFF;
                color: white;
            }

            .ml-push-popup-accept:hover {
                background: #0056CC;
                transform: translateY(-1px);
            }

            .ml-push-popup-decline {
                background: #f5f5f5;
                color: #666;
            }
            
            .ml-dark-mode .ml-push-popup-decline {
                background: #48484a;
                color: #a1a1a6;
            }

            .ml-push-popup-decline:hover {
                background: #e5e5e5;
            }
            
            .ml-dark-mode .ml-push-popup-decline:hover {
                background: #5a5a5c;
            }

            .ml-push-popup-success {
                background: #e8f5e9;
                border: 1.5px solid #34c759;
                color: #256029;
                border-radius: 12px;
                padding: 16px 24px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 1px 6px rgba(52,199,89,0.1);
            }
            
            .ml-dark-mode .ml-push-popup-success {
                background: #1e3a1e;
                border-color: #30d158;
                color: #30d158;
            }

            @media (max-width: 480px) {
                .ml-push-popup {
                    margin: 0;
                    border-radius: 20px 20px 0 0;
                }
                
                .ml-push-popup-heading {
                    font-size: 20px;
                }
                
                .ml-push-popup-text {
                    font-size: 15px;
                }
            }

        `;
            const styleSheet = document.createElement('style');
            styleSheet.id = 'ml-push-popup-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
        // Increment style usage count
        PushNotificationPopup.styleUsageCount++;
    }

    createPopup() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'ml-push-popup-overlay';

        // Create popup container
        this.popup = document.createElement('div');
        this.popup.className = 'ml-push-popup';
        
        // Apply dark mode if enabled
        if (this.options.darkMode) {
            this.popup.classList.add('ml-dark-mode');
        }

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ml-push-popup-close';
        closeBtn.innerHTML = '&times;'; // Use HTML entity for more reliable display
        closeBtn.addEventListener('click', () => this.hide(true));

        // Create content container
        const content = document.createElement('div');
        content.className = 'ml-push-popup-content';

        // Create heading
        const heading = document.createElement('h2');
        heading.className = 'ml-push-popup-heading';
        heading.textContent = this.options.heading;

        // Create image (if provided)
        let image = null;
        if (this.options.image) {
            image = document.createElement('img');
            image.className = 'ml-push-popup-image';
            image.src = this.options.image;
            image.alt = 'Notification icon';
        }

        // Create text
        const text = document.createElement('p');
        text.className = 'ml-push-popup-text';
        text.textContent = this.options.text;

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'ml-push-popup-buttons';

        // Create accept button
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'ml-push-popup-button ml-push-popup-accept';
        acceptBtn.textContent = this.options.acceptText;
        acceptBtn.addEventListener('click', () => {
            // Track accept action before triggering push prompt
            this.trackEvent('ml_popup_accepted', {
                event_category: 'conversion'
            });
            
            this.triggerPushPrompt();
        });

        // Create decline button (only if declineText is provided)
        let declineBtn = null;
        if (this.options.declineText && this.options.declineText.trim() !== '') {
            declineBtn = document.createElement('button');
            declineBtn.className = 'ml-push-popup-button ml-push-popup-decline';
            declineBtn.textContent = this.options.declineText;
            declineBtn.addEventListener('click', () => {
                // Track decline action
                this.trackEvent('ml_popup_declined', {
                    event_category: 'engagement'
                });
                
                this.options.onDecline();
                this.hide();
            });
        }

        // Assemble the popup
        content.appendChild(heading);
        if (image) content.appendChild(image);
        content.appendChild(text);
        buttonsContainer.appendChild(acceptBtn);
        if (declineBtn) buttonsContainer.appendChild(declineBtn);
        content.appendChild(buttonsContainer);

        this.popup.appendChild(closeBtn);
        this.popup.appendChild(content);

        // Add to DOM but keep hidden
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.popup);
    }

    triggerPushPrompt() {
        try {
            // Call user's onAccept callback first
            this.options.onAccept();

            // Check if we're in debug mode or if native functions are available
            if (this.options.debugMode) {
                console.log('[PushPopup Debug] Debug mode - simulating push prompt acceptance');
                // Simulate acceptance in debug mode
                setTimeout(() => {
                    this.updateUIForPushStatus(true);
                }, 1000);
                return;
            }

            // Safety check: Ensure native bridge is available
            if (typeof nativeFunctions === 'undefined') {
                throw new Error('nativeFunctions not available');
            }

            // Safety check: Ensure the specific function exists
            if (typeof nativeFunctions.triggerPushPrompt !== 'function') {
                throw new Error('triggerPushPrompt not available');
            }

            // Call the native function to show OS permission dialog
            nativeFunctions.triggerPushPrompt();

            // Don't hide the popup immediately - wait for status change
            // The updateUIForPushStatus method will handle UI updates

        } catch (e) {
            console.error('[PushPopup] Error triggering push prompt:', e);
            // Fallback: just hide the popup
            this.hide();
        }
    }

    bindEvents() {
        // Store handler references for cleanup
        this._onOverlayClick = (e) => {
            if (e.target === this.overlay) {
                this.hide(true);
            }
        };
        this.overlay.addEventListener('click', this._onOverlayClick);

        this._onKeyDown = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide(true);
            }
        };
        document.addEventListener('keydown', this._onKeyDown);
    }

    show(isAutoTrigger = false) {
        if (this.isVisible) return;
        
        // Check if another popup is already visible globally
        if (PushNotificationPopup.currentlyVisible) {
            console.log('[PushPopup] Another popup is already visible - blocking this popup');
            return;
        }
        
        // Check if this is an auto-trigger and we've already auto-triggered this session
        if (isAutoTrigger && this.hasAutoTriggeredThisSession) {
            console.log('[PushPopup] Auto-trigger blocked - already shown once this session');
            return;
        }
        
        // Mark that we've auto-triggered if this is an auto-trigger
        if (isAutoTrigger) {
            this.hasAutoTriggeredThisSession = true;
        }

        this.isVisible = true;
        
        // Set global state to indicate a popup is now visible
        PushNotificationPopup.currentlyVisible = true;
        
        // Increment session count when showing
        this.incrementSessionCount();
        
        // Show overlay first
        requestAnimationFrame(() => {
            this.overlay.classList.add('ml-visible');
            
            // Track that popup is displayed
            this.trackEvent('ml_popup_displayed', {
                event_category: 'engagement',
                trigger_type: isAutoTrigger ? 'auto' : 'manual'
            });
            
            // Then show popup with slight delay
            setTimeout(() => {
                this.popup.classList.add('ml-visible');
            }, 50);
        });

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    hide(userInitiated = false) {
        if (!this.isVisible) return;

        this.isVisible = false;
        
        // Clear global state to allow other popups to show
        PushNotificationPopup.currentlyVisible = false;
        
        // Track user-initiated close events
        if (userInitiated) {
            this.trackEvent('ml_popup_closed', {
                event_category: 'engagement',
                close_method: 'user_action'
            });
        }
        
        // Hide popup first
        this.popup.classList.remove('ml-visible');
        
        // Then hide overlay
        setTimeout(() => {
            this.overlay.classList.remove('ml-visible');
        }, 200);

        // Restore body scroll
        setTimeout(() => {
            document.body.style.overflow = '';
        }, 300);

        // Call onClose callback
        this.options.onClose();
    }

    destroy() {
        // Clear global state if this popup was visible
        if (this.isVisible) {
            PushNotificationPopup.currentlyVisible = false;
            this.isVisible = false;
        }
        
        // Clean up status monitoring
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        
        // Restore original push callback
        if (this._originalPushCallback !== null) {
            window.mlPushStatusChanged = this._originalPushCallback;
        }
        
        // Remove event listeners
        if (this.overlay && this._onOverlayClick) {
            this.overlay.removeEventListener('click', this._onOverlayClick);
        }
        if (this._onKeyDown) {
            document.removeEventListener('keydown', this._onKeyDown);
        }
        if (this.overlay) {
            this.overlay.remove();
        }
        if (this.popup) {
            this.popup.remove();
        }
        // Decrement style usage count and remove style if last popup
        PushNotificationPopup.styleUsageCount = Math.max(0, PushNotificationPopup.styleUsageCount - 1);
        if (PushNotificationPopup.styleUsageCount === 0) {
            const styles = document.getElementById('ml-push-popup-styles');
            if (styles) {
                styles.remove();
            }
        }
    }
}

// Global function for easy usage
window.createPushPopup = function(options) {
    return new PushNotificationPopup(options);
};

