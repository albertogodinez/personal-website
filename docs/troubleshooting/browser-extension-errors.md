# Browser Extension Errors

## Overview

If you see errors like `content.js:17 Uncaught (in promise) ReferenceError: data is not defined` in your browser console, these are **NOT** from your website code. They come from browser extensions running on your page.

## What is content.js?

`content.js` is a common filename used by browser extensions for their "content scripts" - JavaScript that runs on web pages to add functionality like:

- Ad blockers
- Password managers
- Shopping assistants
- Social media tools
- VPNs and privacy tools
- Productivity extensions

When these scripts have bugs or compatibility issues, the errors appear in your console even though they're not part of your codebase.

## Common Extensions That May Cause This Error

The following types of extensions frequently cause `content.js` errors:

### Authentication & Password Managers
- LastPass
- 1Password
- Bitwarden
- Dashlane
- Keeper

### Ad & Tracker Blockers
- uBlock Origin
- AdBlock Plus
- Privacy Badger
- Ghostery

### Shopping & Coupons
- Honey
- Rakuten
- Capital One Shopping
- CouponFollow

### Productivity & Social
- Grammarly
- Loom
- Buffer
- Notion Web Clipper

### Privacy & Security
- DuckDuckGo Privacy Essentials
- HTTPS Everywhere
- VPN extensions

## How to Identify the Culprit Extension

### Method 1: Test in Incognito Mode

1. Open an incognito/private browsing window
2. Load your website
3. Open DevTools Console (F12 or Cmd+Option+I)
4. Check if the error still appears

**If the error is GONE in incognito:**
- The error is definitely from a browser extension
- Extensions are disabled by default in incognito mode

**If the error STILL appears in incognito:**
- Either an extension is allowed in incognito mode, OR
- The error is from your actual code (rare)

### Method 2: Binary Search with Extensions

1. Open `chrome://extensions` (Chrome) or `about:addons` (Firefox)
2. Disable half of your extensions
3. Reload your website and check the console
4. If error persists, disable half of the remaining enabled extensions
5. If error disappears, re-enable half of the disabled group
6. Repeat until you find the specific extension

### Method 3: Check Error Stack Trace

1. Open DevTools Console (F12)
2. Click the error to expand the full stack trace
3. Look for extension-specific identifiers in the file paths:

```
chrome-extension://abcdefghijklmnop/content.js:17
```

The extension ID (`abcdefghijklmnop`) can be matched to extensions in `chrome://extensions`.

### Method 4: Create a Fresh Profile

1. Create a new browser profile with no extensions
2. Test your website in the clean profile
3. If no errors appear, the issue is definitely extension-related

## What to Do About It

### For Development

These errors are **noise** and can be safely ignored. They don't affect your website's functionality or indicate bugs in your code.

**Best practice:**
- Filter them out using console filtering (see [console-filtering.md](./console-filtering.md))
- Use incognito mode for debugging your own code
- Document known extension conflicts for your team

### For Production

Your website visitors may see these errors in their console, but:
- They don't affect the user experience
- They don't impact your site's performance
- They're not a reflection of your code quality
- Most users never open the console

**You cannot fix extension errors.** Only the extension developer can.

## Reporting the Issue

If you want to help fix the extension issue:

1. Identify the specific extension (see methods above)
2. Note the exact error message
3. Note which page/action triggers the error
4. Report it to the extension developer via:
   - Extension's support email
   - Extension's GitHub repository (if open source)
   - Chrome Web Store or Firefox Add-ons review section

## Verification Checklist

To confirm an error is NOT from your codebase:

- [ ] Error disappears in incognito mode (with no extensions)
- [ ] Error filename is `content.js`, `inject.js`, or similar generic name
- [ ] Error stack trace includes `chrome-extension://` or `moz-extension://`
- [ ] Error occurs on multiple unrelated websites
- [ ] Error doesn't appear when running your built app without extensions
- [ ] Grepping your codebase for the error message returns no results

## Related Documentation

- [Console Filtering Guide](./console-filtering.md) - Filter out extension noise
- [CLAUDE.md](../../CLAUDE.md) - Project coding guidelines

## Additional Resources

- [Chrome Extension Content Scripts Documentation](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [MDN: Browser Extension Content Scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
