# Mobile Spacewalk Architecture - Clean Separation

## Design Principle

**Clean separation between desktop and mobile implementations.**

No shared code with conditional logic. Each platform has its own dedicated components that import only what they need.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Shared Layer                           │
│  (Core functionality used by both platforms)                │
├─────────────────────────────────────────────────────────────┤
│  • appGlobals.js         - Shared state management          │
│  • ensembleManager.js    - Data management                  │
│  • colorMapManager.js    - Color mapping                    │
│  • Three.js components   - Rendering (PointCloud, etc.)     │
│  • genomicNavigator.js   - Navigation widget                │
└─────────────────────────────────────────────────────────────┘
                          ▲         ▲
                          │         │
          ┌───────────────┘         └───────────────┐
          │                                         │
┌─────────────────────┐                 ┌─────────────────────┐
│   Desktop Layer     │                 │    Mobile Layer     │
├─────────────────────┤                 ├─────────────────────┤
│ • app.js            │                 │ • mobileApp.js      │
│ • sceneManager.js   │                 │ • mobileSceneMgr.js │
│ • uiBootstrapper.js │                 │ • mobileUIBoot.js   │
│ • panelInitializer  │                 │                     │
│ • IGV Panel         │                 │ (No panels)         │
│ • Juicebox Panel    │                 │                     │
│ • Full UI widgets   │                 │ (Minimal UI)        │
└─────────────────────┘                 └─────────────────────┘
```

## File Structure

### Desktop-Only Files
```
js/app.js                          - Desktop application class
js/sceneManager.js                 - Desktop scene manager (with IGV/Juicebox)
js/initializers/uiBootstrapper.js  - Desktop UI initialization
js/initializers/panelInitializer.js - Desktop panel setup
js/IGVPanel.js                     - IGV genome browser integration
js/juicebox/juiceboxPanel.js       - Juicebox Hi-C map integration
js/guiManager.js                   - Desktop GUI controls
js/traceSelector.js                - Desktop trace selector widget
```

### Mobile-Only Files
```
js/mobileApp.js                           - Mobile application class
js/mobileSceneManager.js                  - Mobile scene manager (no panels)
js/initializers/mobileUIBootstrapper.js   - Mobile UI initialization
styles/mobile.scss                        - Mobile styles
styles/_mobile-layout.scss                - Mobile layout utilities
mobile.html                               - Mobile entry page
```

### Shared Files
```
js/appGlobals.js              - Shared state (both apps update this)
js/ensembleManager.js         - Data management (platform-agnostic)
js/colorMapManager.js         - Color mapping (platform-agnostic)
js/genomicNavigator.js        - Navigation widget (used by both)
js/pointCloud.js              - 3D rendering (used by both)
js/ballAndStick.js            - 3D rendering (used by both)
js/ribbon.js                  - 3D rendering (used by both)
js/cameraLightingRig.js       - Camera controls (used by both)
```

## Key Differences

### SceneManager vs MobileSceneManager

**Desktop `sceneManager.js`:**
- ✅ Imports from `appGlobals.js`
- ✅ Requires IGV panel
- ✅ Requires Juicebox panel
- ✅ Uses GUIManager for render style
- ✅ Syncs with IGV browser genome
- ✅ Updates IGV locus
- ✅ Manages track materials

**Mobile `mobileSceneManager.js`:**
- ✅ Imports from `appGlobals.js`
- ❌ No IGV panel dependency
- ❌ No Juicebox panel dependency
- ❌ No GUIManager dependency
- ✅ Default render style (BallAndStick)
- ✅ Simpler material management
- ✅ Ground plane/gnomon hidden by default

### App vs MobileApp

**Desktop `app.js`:**
```javascript
import SceneManager from "./sceneManager.js"
import UIBootstrapper from "./initializers/uiBootstrapper.js"
import PanelInitializer from "./initializers/panelInitializer.js"

// Initializes:
// - Scene manager (with panels)
// - Full UI (navbar, menus, widgets)
// - IGV Panel
// - Juicebox Panel
// - Trace Selector
// - Session management
// - Share widgets
```

**Mobile `mobileApp.js`:**
```javascript
import MobileSceneManager from "./mobileSceneManager.js"
import MobileUIBootstrapper from "./initializers/mobileUIBootstrapper.js"

// Initializes:
// - Mobile scene manager (no panels)
// - Minimal UI (URL input only)
// - Genomic Navigator
// - Basic file loading
```

## Shared State Management

Both apps update `appGlobals.js` during initialization:

```javascript
// In app.js or mobileApp.js
import { updateGlobals } from "./appGlobals.js"

// After initialization
updateGlobals({
    ensembleManager: this.ensembleManager,
    sceneManager: this.sceneManager,
    pointCloud: this.pointCloud,
    // ... etc
})
```

Other modules import from `appGlobals.js`:

```javascript
// In any shared module
import {
    ensembleManager,
    sceneManager,
    pointCloud,
    // ... etc
} from "./appGlobals.js"

// These are populated by whichever app is running
```

## Benefits of This Architecture

### 1. **Zero Coupling**
- Desktop code never checks `if (mobile)`
- Mobile code never checks `if (desktop)`
- No shared files with conditional logic

### 2. **Independent Evolution**
- Desktop features can be added without affecting mobile
- Mobile can be optimized without desktop concerns
- Different dependencies per platform

### 3. **Clear Responsibilities**
```
Desktop: Full-featured visualization + genome browser integration
Mobile:  Streamlined 3D viewer only
Shared:  Core rendering and data management
```

### 4. **Easier Maintenance**
- Bug in IGV integration? Only check `sceneManager.js`
- Bug in mobile loading? Only check `mobileSceneManager.js`
- No need to trace conditional paths

### 5. **Smaller Bundles**
- Mobile doesn't bundle desktop-only code
- Desktop doesn't bundle mobile-only code
- Tree shaking works optimally

## Import Graph

### Desktop Import Chain
```
desktop.html
  └─> main.js
      └─> app.js
          ├─> sceneManager.js (desktop version)
          │   └─> appGlobals.js
          ├─> uiBootstrapper.js
          │   └─> spacewalkFileLoadWidgetServices.js
          └─> panelInitializer.js
              ├─> IGVPanel.js
              └─> juiceboxPanel.js
```

### Mobile Import Chain
```
mobile.html
  └─> mobile-main.js
      └─> mobileApp.js
          ├─> mobileSceneManager.js (mobile version)
          │   └─> appGlobals.js
          └─> mobileUIBootstrapper.js
              └─> (Simple URL loading, no widgets)
```

## Testing Strategy

### Desktop Tests
- Run desktop dev server: `npm run dev:desktop`
- Test with full UI, IGV, Juicebox
- Verify panel interactions

### Mobile Tests
- Run mobile dev server: `npm run dev:mobile`
- Test with minimal UI
- Verify URL loading works
- Test on actual mobile devices

### Integration Tests
Both should:
- Load the same `.sw` files
- Render the same 3D data
- Use the same color maps
- Produce the same visual output

## Future Enhancements

### Desktop-Specific
- Additional panels (new genome browsers, etc.)
- Advanced session management
- Complex file loading workflows
- Desktop-specific UI controls

### Mobile-Specific
- Touch gestures (pinch-to-zoom)
- PWA support
- Offline mode
- Mobile-specific optimizations
- Simplified file picker

### Shared
- Better 3D rendering performance
- New file format support
- Enhanced color mapping
- Improved data loading

## Migration Guide

If you need to add a feature:

1. **Shared feature** (both platforms need it)
   - Add to shared layer (e.g., new rendering mode)
   - Update both `sceneManager.js` and `mobileSceneManager.js`
   
2. **Desktop-only feature** (e.g., new panel)
   - Add only to desktop files
   - Update `app.js` and `sceneManager.js`
   - Mobile unaffected
   
3. **Mobile-only feature** (e.g., touch gesture)
   - Add only to mobile files
   - Update `mobileApp.js` or `mobileSceneManager.js`
   - Desktop unaffected

## Summary

This architecture achieves **complete separation** between desktop and mobile while maximizing code reuse through a well-defined shared layer. No conditionals, no coupling, clean boundaries.

**Guiding Principle:** *If you're adding an `if` statement to check which platform you're on, you're doing it wrong. Create separate implementations instead.*

