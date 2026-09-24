# Troubleshooting Guide

This directory contains guides for debugging common issues during development.

## Browser & Console Issues

### [Browser Extension Errors](./browser-extension-errors.md)

**When to read:** You see errors like `content.js:17 Uncaught (in promise) ReferenceError: data is not defined` in your console.

**What it covers:**
- What content.js errors are and why they appear
- How to identify which browser extension is causing the error
- Common extensions that frequently cause issues
- Why these errors are safe to ignore
- How to verify the error is not from your codebase

**Quick test:** Open your site in incognito mode. If the error disappears, it's from an extension.

### [Console Filtering Guide](./console-filtering.md)

**When to read:** Browser extension errors are cluttering your DevTools console and making it hard to see your own logs.

**What it covers:**
- How to filter out extension errors in Chrome/Edge/Firefox DevTools
- Setting up regex filters for advanced filtering
- Creating a clean development browser profile
- Keyboard shortcuts for console management
- Team best practices for console filtering

**Quick filter:** In DevTools console filter input, enter: `-chrome-extension: -content.js`

## Error Categories

### Extension-Related Errors (Not Your Code)

**Symptoms:**
- Errors in files named `content.js`, `inject.js`, `inpage.js`
- Stack traces include `chrome-extension://` or `moz-extension://`
- Errors disappear in incognito mode
- Same error appears on unrelated websites

**Action:** See [Browser Extension Errors](./browser-extension-errors.md)

### Your Code Errors

**Symptoms:**
- Errors in files from your `src/` directory
- Stack traces point to your components/pages
- Errors persist in incognito mode
- Errors only appear on your site

**Action:** Debug normally using DevTools. Review [CLAUDE.md](../../CLAUDE.md) for coding guidelines.

## Quick Reference

### Verification Steps

To confirm an error is NOT from your codebase:

1. Open incognito/private browsing window
2. Load your website
3. Open DevTools Console (F12)
4. Check if error still appears

- Error gone = Extension issue
- Error present = Check if extension is enabled in incognito, or it's your code

### Development Best Practices

**For clean debugging:**
- Use incognito mode during active development
- Create a dedicated browser profile without extensions
- Set up console filters to hide extension noise
- Run production builds before pushing (see [CLAUDE.md](../../CLAUDE.md))

**For testing:**
- Test with common extensions users might have
- Test production build vs dev server
- Verify styles and layout match between environments

## Contributing to This Guide

Found a new issue or solution? Add it to the appropriate guide or create a new one:

1. Create a new markdown file in this directory
2. Follow the structure of existing guides
3. Link it from this README
4. Update main [README.md](../../README.md) if widely applicable

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Code style guidelines and pre-push validation
- [Main README](../../README.md) - Project overview and commands
- [Chrome DevTools Docs](https://developer.chrome.com/docs/devtools/)
- [Firefox DevTools Docs](https://firefox-source-docs.mozilla.org/devtools-user/)

## Support

For project-specific questions or issues not covered here, create an issue in the repository or reach out to the team.
