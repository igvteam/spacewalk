# Spacewalk Mobile Build Guide

## Overview

Spacewalk now supports two separate builds:
- **Desktop**: Full-featured application with IGV, Juicebox, and all desktop functionality
- **Mobile**: Streamlined application optimized for mobile devices with touch-friendly 3D viewer

## Quick Start

### Development

Start the mobile development server:
```bash
npm run dev:mobile
```

Start the desktop development server:
```bash
npm run dev:desktop
```

Or use the default (desktop):
```bash
npm run dev
```

### Production Build

Build for mobile:
```bash
npm run build:mobile
```

Build for desktop:
```bash
npm run build:desktop
```

### Preview Builds

Preview mobile build:
```bash
npm run preview:mobile
```

Preview desktop build:
```bash
npm run preview:desktop
```

### Serve Built Files

Serve mobile build with http-server:
```bash
npm run start:mobile
```

Serve desktop build with http-server:
```bash
npm run start
```

## Mobile Features

### Included
- ✅ 3D visualization (PointCloud, BallAndStick, Ribbon rendering)
- ✅ Genomic Navigator with color ramp
- ✅ Touch-optimized interface
- ✅ URL-based file loading
- ✅ Full Three.js rendering pipeline
- ✅ Camera controls (OrbitControls)
- ✅ Scene management

### Not Included
- ❌ IGV Panel (genome browser)
- ❌ Juicebox Panel (Hi-C contact maps)
- ❌ Trace Selector
- ❌ Session management UI
- ❌ Share functionality
- ❌ Desktop file loading widgets
- ❌ Complex navigation menu
- ❌ Settings panel UI

## File Structure

### New Files Created

**Build Configuration:**
- `vite.config.desktop.mjs` - Desktop build config
- `vite.config.mobile.mjs` - Mobile build config

**HTML:**
- `desktop.html` - Desktop application (renamed from index.html)
- `mobile.html` - Mobile application

**JavaScript:**
- `js/mobileApp.js` - Mobile application class
- `js/mobile-main.js` - Mobile entry point
- `js/initializers/mobileUIBootstrapper.js` - Mobile UI initialization

**Styles:**
- `styles/mobile.scss` - Mobile styles
- `styles/_mobile-layout.scss` - Mobile layout utilities

### Output Directories

- `dist/` - Desktop build output
- `dist-mobile/` - Mobile build output

## Mobile UI

The mobile interface consists of:

1. **Header**
   - App title
   - URL input field
   - Load button

2. **Main Content**
   - Full-screen 3D viewer
   - Genomic Navigator (side panel with color ramp)

3. **Loading Indicator**
   - Spinner for file loading

## Using the Mobile App

### Loading Data

1. Open the mobile app in a browser
2. Paste a URL to a `.sw` file in the input field
3. Click "Load" or press Enter
4. Wait for the file to load (spinner will appear)
5. Interact with the 3D visualization

### Supported URL Parameters

The mobile app supports the same URL parameters as desktop for compatibility:
- `?spacewalkSessionURL=...` - Load a Spacewalk session

Example:
```
https://your-domain.com/mobile.html?spacewalkSessionURL=encoded_session_data
```

### 3D Viewer Interaction

- **Rotate**: Touch and drag
- **Zoom**: Pinch gesture (if supported by OrbitControls)
- **Pan**: Two-finger drag

### Genomic Navigator

- **Tap** on the color ramp to navigate to a specific genomic position

## Bundle Sizes

- **Desktop**: ~4.3 MB uncompressed, ~1.2 MB gzipped
- **Mobile**: ~1.9 MB uncompressed, ~575 KB gzipped

The mobile bundle is approximately **55% smaller** than desktop.

## Browser Compatibility

### Requirements
- WebGL 2.0 support
- Modern browser (Chrome, Safari, Firefox, Edge)
- JavaScript enabled

### Recommended
- Chrome 90+ on Android
- Safari 14+ on iOS
- Latest versions for best performance

## Development Tips

### Testing Mobile Locally

1. Start the dev server:
   ```bash
   npm run dev:mobile
   ```

2. Access from mobile device on the same network:
   ```
   http://your-computer-ip:5173/mobile.html
   ```

3. Or use browser dev tools to simulate mobile:
   - Open Chrome DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
   - Select a mobile device

### Hot Module Replacement

Vite provides HMR for both builds during development. Changes to code will automatically reload.

### Debugging

Mobile apps can be debugged using:
- Chrome DevTools for Android (chrome://inspect)
- Safari Web Inspector for iOS
- Desktop browser with mobile emulation

## Customization

### Modifying Mobile UI

Edit `mobile.html` and `styles/mobile.scss` to customize the mobile interface.

### Adding Mobile Features

1. Add functionality to `js/mobileApp.js`
2. Update `js/initializers/mobileUIBootstrapper.js` if UI changes needed
3. Test with mobile viewport

### Changing Mobile Dependencies

The mobile build automatically includes only the dependencies used by `mobile-main.js`. To reduce bundle size further, consider:
- Code splitting with dynamic imports
- Lazy loading features
- Tree shaking unused code

## Deployment

### Static Hosting

Both builds can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

### Separate Deployments

You can deploy desktop and mobile to different URLs:
```
Desktop: https://spacewalk.example.com/
Mobile:  https://m.spacewalk.example.com/
```

Or same URL with detection:
```
https://spacewalk.example.com/          (desktop)
https://spacewalk.example.com/mobile/   (mobile)
```

## Troubleshooting

### Build Errors

If you encounter build errors:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Try building again
npm run build:mobile
```

### WebGL Errors

If WebGL 2.0 is not supported:
- Check browser compatibility
- Enable hardware acceleration
- Update graphics drivers
- Try a different browser

### File Loading Issues

If files fail to load:
- Check URL is accessible
- Verify CORS headers on the server
- Ensure file format is correct (.sw)
- Check browser console for errors

## Future Enhancements

Potential improvements:
- [ ] Progressive Web App (PWA) support
- [ ] Offline mode with service workers
- [ ] Better touch gesture support
- [ ] Orientation lock controls
- [ ] File size warnings
- [ ] Installation prompt for mobile
- [ ] Share capability via Web Share API
- [ ] Local file picker for mobile

## Support

For issues or questions:
- GitHub Issues: https://github.com/igvteam/spacewalk/issues
- Documentation: https://github.com/igvteam/spacewalk/blob/master/README.md

