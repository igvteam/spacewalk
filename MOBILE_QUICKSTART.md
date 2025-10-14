# Mobile Spacewalk - Quick Start

## 🚀 Get Started in 30 Seconds

### Run Mobile Version
```bash
npm run dev:mobile
```
Open browser to: `http://localhost:5173/mobile.html`

### Run Desktop Version
```bash
npm run dev:desktop
```
Open browser to: `http://localhost:5173/desktop.html`

---

## 📦 Build for Production

### Mobile
```bash
npm run build:mobile
```
Output: `dist-mobile/mobile.html`

### Desktop
```bash
npm run build:desktop
```
Output: `dist/desktop.html`

---

## 🎯 What's Different?

**Desktop**: Full app with IGV, Juicebox, all features (4.3 MB)  
**Mobile**: 3D viewer + navigator only (1.9 MB) - 55% smaller!

---

## 📱 Mobile UI

```
┌─────────────────────────────┐
│ Spacewalk  [URL Input] [Load]│  ← Header
├─────────────────────────────┤
│                             │
│      3D Viewer              │  ← Main
│      (Touch to rotate)      │
│                      ║ Nav  │  ← Navigator
│                      ║      │
└─────────────────────────────┘
```

---

## 📋 Files Created

```
✓ mobile.html                          ← Entry point
✓ js/mobileApp.js                      ← App class
✓ js/mobile-main.js                    ← Main entry
✓ js/initializers/mobileUIBootstrapper.js
✓ styles/mobile.scss                   ← Styles
✓ vite.config.mobile.mjs               ← Build config
```

---

## 🔧 All Commands

| Command | Purpose |
|---------|---------|
| `npm run dev:mobile` | Mobile dev server |
| `npm run dev:desktop` | Desktop dev server |
| `npm run build:mobile` | Build mobile |
| `npm run build:desktop` | Build desktop |
| `npm run preview:mobile` | Preview mobile build |
| `npm run preview:desktop` | Preview desktop build |
| `npm run start:mobile` | Serve mobile (port 8080) |
| `npm run start` | Serve desktop (port 8080) |

---

## 📖 Full Documentation

- `MOBILE_README.md` - Complete guide
- `MOBILE_BUILD_SUMMARY.md` - Technical details
- `IMPLEMENTATION_COMPLETE.md` - What was built

---

## ✅ Verification

Test both builds:
```bash
npm run build:mobile && npm run build:desktop
```

Both should complete without errors!

