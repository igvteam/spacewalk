# Color Picker UI Fix for Mobile

## Problem

Components were trying to create color picker UI elements that only exist in desktop HTML:
```javascript
// This crashes on mobile:
this.colorPicker = createColorPicker(
    document.querySelector(`div[data-colorpicker='groundplane']`),  // null on mobile!
    this.color,
    callback
);
```

## Root Cause

The desktop HTML has UI elements for color pickers:
```html
<!-- Desktop only: -->
<div data-colorpicker="groundplane"></div>
<div data-colorpicker="gnomon"></div>
<div data-colorpicker="scale-bars"></div>
<div data-colorpicker="background"></div>
```

Mobile HTML doesn't have these UI elements (intentionally - no settings panel).

When `document.querySelector()` returns null, `createColorPicker()` tries to access `.style` on null → crash.

## Solution

Made color picker creation conditional - only create if DOM element exists:

```javascript
// Before (crashes on mobile):
this.colorPicker = createColorPicker(
    document.querySelector(`div[data-colorpicker='groundplane']`),
    this.color,
    callback
);

// After (works on both):
const container = document.querySelector(`div[data-colorpicker='groundplane']`);
if (container) {
    this.colorPicker = createColorPicker(container, this.color, callback);
} else {
    this.colorPicker = null;
}
```

Also made `updateColorPicker()` calls conditional:

```javascript
// Before (crashes on mobile):
updateColorPicker(this.colorPicker, document.querySelector(...), {r, g, b});

// After (works on both):
if (this.colorPicker) {
    const container = document.querySelector(...);
    if (container) {
        updateColorPicker(this.colorPicker, container, {r, g, b});
    }
}
```

## Files Updated

### 1. `js/groundPlane.js`
- Made `createColorPicker()` conditional (line 20-26)
- Made `updateColorPicker()` conditional in `setState()` (line 68-74)

### 2. `js/gnomon.js`
- Made `createColorPicker()` conditional (line 40-50)
- Made `updateColorPicker()` conditional in `setState()` (line 92-98)

### 3. `js/scaleBarService.js`
- Made `createColorPicker()` conditional (line 16-22)
- Made `updateColorPicker()` conditional in `setState()` (line 168-174)

### 4. `js/initializers/threeJSInitializer.js` (Already fixed earlier)
- Already handles null `colorPickerContainer` for background (line 96-111)

## Why This Works

### Desktop Flow:
1. HTML has `<div data-colorpicker="groundplane"></div>`
2. `document.querySelector()` returns the div
3. Color picker UI created ✅
4. User can interact with color picker ✅

### Mobile Flow:
1. HTML doesn't have color picker divs
2. `document.querySelector()` returns null
3. Check fails, `this.colorPicker = null` ✅
4. No UI created (not needed on mobile) ✅
5. Visualization still works (colors are set internally) ✅

## Impact on Mobile

✅ Ground plane, gnomon, and scale bars are created and rendered correctly
✅ Colors work (set programmatically, not via UI)
✅ No color picker UI (not needed on mobile)
✅ No crashes

## Impact on Desktop

✅ Color picker UI still works
✅ Users can still change colors via UI
✅ No behavior changes

## Result

✅ No linter errors
✅ Both platforms work correctly
✅ Clean conditional handling
✅ Mobile has no unnecessary UI elements

**The mobile app should now successfully load and render 3D data! 🎉**

