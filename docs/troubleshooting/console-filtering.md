# Console Filtering Guide

## Overview

Browser extension errors can clutter your DevTools console, making it harder to debug your own code. This guide shows how to filter out the noise and focus on messages from your website.

## Quick Filters

### Chrome/Edge DevTools

#### Filter by Source (Recommended)

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for the filter input box at the top
4. Use the negative filter to hide extension messages:

```
-chrome-extension:
```

This hides all messages from Chrome extensions.

#### Filter Multiple Patterns

You can combine multiple negative filters:

```
-chrome-extension: -content.js -inject.js
```

#### Filter by Log Level

Click the level filters:
- Errors only: Select "Errors" dropdown
- Hide verbose/info: Uncheck "Verbose" and "Info"

### Firefox DevTools

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Use the filter input:

```
-moz-extension:
```

Or filter by filename:

```
-content.js
```

## Advanced Filtering

### Regular Expression Filters

Chrome DevTools supports regex for powerful filtering.

1. Click the "Regex" icon (looks like `.*`) next to the filter input
2. Enter a pattern:

**Hide all extension content scripts:**
```regex
^(?!.*(chrome-extension|moz-extension|content\.js)).*
```

**Show only your domain:**
```regex
localhost|albertogodinez\.me
```

**Hide specific error types:**
```regex
^(?!.*(ReferenceError.*content\.js|Uncaught.*extension)).*
```

### Create Filter Presets

Chrome allows saving custom console configurations:

1. Open DevTools Settings (F1 or gear icon)
2. Go to "Console" section
3. Check "Show messages from content scripts" to toggle visibility
4. Use "Selected context only" dropdown to filter by source

### Workspace-Level Filtering

For consistent filtering across sessions:

1. Right-click in the Sources panel
2. Select "Add folder to workspace"
3. Add your project directory
4. DevTools will prioritize showing errors from workspace files

## Console Sidebar Filtering

### Chrome DevTools Sidebar

1. In Console, click the "Sidebar" icon (three vertical lines)
2. You'll see error sources listed
3. Uncheck sources you want to hide:
   - `chrome-extension://...` entries
   - `content.js` files
   - Extension-specific scripts

### Group Similar Messages

1. Right-click in the console
2. Enable "Group similar messages"
3. Extension errors will collapse into single expandable entries

## Command Line API Filters

For programmatic filtering during debugging:

```javascript
// In DevTools console, override console.error temporarily
const originalError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  if (!message.includes('chrome-extension') && !message.includes('content.js')) {
    originalError.apply(console, args);
  }
};
```

**Note:** This only works for the current page session.

## Browser Profile for Clean Development

### Chrome/Edge

Create a dedicated development profile without extensions:

1. Click your profile icon (top right)
2. Select "Add" to create new profile
3. Name it "Development" or "Clean"
4. Don't install any extensions in this profile
5. Switch to this profile when developing

**Benefits:**
- Zero extension noise
- Faster page loads
- Consistent debugging environment

### Firefox

1. Enter `about:profiles` in address bar
2. Click "Create a New Profile"
3. Name it "Development"
4. Launch this profile for development work

## Debugging Best Practices

### During Active Development

**Use Incognito/Private Mode:**
- Extensions disabled by default
- Clean slate each time
- No cached data interference

**Launch with extensions disabled:**

Chrome:
```bash
# Mac
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-extensions

# Linux
google-chrome --disable-extensions

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-extensions
```

Firefox:
```bash
# Mac
/Applications/Firefox.app/Contents/MacOS/firefox -safe-mode

# Linux
firefox -safe-mode

# Windows
"C:\Program Files\Mozilla Firefox\firefox.exe" -safe-mode
```

### Production Testing

Test with common extension combinations that your users might have:

1. Ad blockers (uBlock Origin)
2. Password managers (LastPass, 1Password)
3. Privacy tools (DuckDuckGo Privacy Essentials)

This helps identify actual compatibility issues vs. extension bugs.

## Console Filter Templates

Copy-paste these into your filter input:

### Basic Filters

**Hide all extensions:**
```
-chrome-extension: -moz-extension:
```

**Hide content scripts:**
```
-content.js -inject.js -inpage.js
```

**Show only errors and warnings:**
```
level:error level:warning
```

### Advanced Filters

**Hide extensions but show your errors:**
```
level:error -chrome-extension: -content.js
```

**Show only localhost messages:**
```
url:localhost
```

**Hide specific extension by ID:**
```
-chrome-extension://abcdefghijklmnop
```

Replace `abcdefghijklmnop` with the actual extension ID from the error.

## Keyboard Shortcuts

Speed up console management:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + L` | Clear console |
| `Cmd/Ctrl + F` | Find in console |
| `Cmd/Ctrl + Shift + P` | Command palette (search for filter options) |
| `Esc` | Toggle console drawer |

## ASCII Art: Console Filtering Flow

```
┌─────────────────────────────────────┐
│   DevTools Console                  │
│                                     │
│  [Filter: -chrome-extension: ]     │
│  ┌─────────────────────────────┐   │
│  │ Your Code Error ✓           │   │
│  │ Your Warning ✓              │   │
│  │ chrome-extension:// ✗       │   │ <- Hidden
│  │ content.js:17 ✗             │   │ <- Hidden
│  │ Your Log Message ✓          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

Flow: Error Generated → Filter Applied → Display Decision
       Extension Error → Check Filter → Hide
       Your Error → Check Filter → Show
```

## Troubleshooting Filters

**Filter not working?**

1. Check for typos in filter syntax
2. Ensure regex mode is enabled/disabled as needed
3. Try clearing console and refreshing page
4. Verify the extension error pattern matches your filter

**Still seeing some extension errors?**

Some extensions inject code that appears to come from your domain. These are harder to filter. Best solution: disable the extension or use incognito mode.

## Related Documentation

- [Browser Extension Errors](./browser-extension-errors.md) - Identify extension-related errors
- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [Firefox DevTools Documentation](https://firefox-source-docs.mozilla.org/devtools-user/)

## Tips for Teams

**Share filter configurations:**

1. Document your team's standard filters in this file or team wiki
2. Create a browser profile template with pre-configured filters
3. Include console filtering in onboarding documentation
4. Add this guide to your README or development setup docs

**Example team standard:**
```
Filters: -chrome-extension: -content.js level:error level:warning
Log Level: Errors + Warnings only
Sidebar: Hide all chrome-extension sources
```
