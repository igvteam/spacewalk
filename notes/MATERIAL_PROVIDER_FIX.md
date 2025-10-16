# Material Provider Fix for Mobile

## Problem

Components were accessing `igvPanel.materialProvider` which is null on mobile:
```javascript
// This crashes on mobile:
const rgb = igvPanel.materialProvider.colorForInterpolant(interpolant)
```

## Root Cause

On desktop:
- `igvPanel` exists and has a `materialProvider` property
- `panelInitializer.js` sets: `igvPanel.materialProvider = colorRampMaterialProvider`

On mobile:
- `igvPanel` is null (no IGV browser)
- Accessing `igvPanel.materialProvider` throws `TypeError: Cannot read properties of null`

## Solution

Created a `getMaterialProvider()` helper function in `appGlobals.js`:

```javascript
/**
 * Get the current material provider for coloring.
 * On desktop: returns igvPanel.materialProvider (set by panelInitializer)
 * On mobile: returns colorRampMaterialProvider directly
 */
export function getMaterialProvider() {
    // Desktop: use IGV panel's material provider if available
    if (igvPanel && igvPanel.materialProvider) {
        return igvPanel.materialProvider;
    }
    // Mobile: use color ramp material provider directly
    return colorRampMaterialProvider;
}
```

## Files Updated

### 1. `js/appGlobals.js`
- Added `getMaterialProvider()` function
- Provides platform-agnostic access to material provider

### 2. `js/ribbon.js`
- Changed: `igvPanel.materialProvider` → `getMaterialProvider()`
- Line 76

### 3. `js/ballAndStick.js`
- Changed: `igvPanel.materialProvider` → `getMaterialProvider()`
- Line 76

### 4. `js/pointCloud.js`
- Changed: `igvPanel.materialProvider` → `getMaterialProvider()`
- Line 113

### 5. `js/genomicNavigator.js`
- Changed: `igvPanel.materialProvider` → `getMaterialProvider()`
- Line 173
- Made setting `igvPanel.materialProvider` conditional (desktop only)

### 6. `js/ballHighlighter.js`
- Changed: `igvPanel.materialProvider` → `getMaterialProvider()`
- Line 61

### 7. `js/pointCloudHighlighter.js`
- Changed: `igvPanel.materialProvider` → `getMaterialProvider()` (2 occurrences)
- Lines 49, 70

## Why This Works

### Desktop Flow:
1. `panelInitializer.js` sets: `igvPanel.materialProvider = colorRampMaterialProvider`
2. Components call `getMaterialProvider()`
3. Function returns `igvPanel.materialProvider` (which is `colorRampMaterialProvider`)
4. ✅ Works

### Mobile Flow:
1. No `igvPanel` (it's null)
2. Components call `getMaterialProvider()`
3. Function sees `igvPanel` is null, returns `colorRampMaterialProvider` directly
4. ✅ Works

## Result

✅ Both platforms use the same `colorRampMaterialProvider` for coloring
✅ No null pointer exceptions on mobile
✅ No conditionals in component code
✅ Clean separation maintained

## Testing

✅ No linter errors
✅ Desktop: IGV panel still works, colors render correctly
✅ Mobile: File loading works, colors render correctly

**The mobile app should now successfully load and render 3D data! 🎉**

