# Zoku TV — 60fps Butter Smoothness & 32-Bit Android TV / Virtual Mouse Optimization Plan

This plan details the architecture and visual performance upgrades to deliver a locked 60fps experience across vertical scrolling, horizontal rail navigation, card interactions, and route transitions—engineered specifically to run smoothly on 32-bit Android TV WebViews and virtual mouse browsers such as **Downloader by AFTVnews**.

---

## User Review & Critical Decisions

- **Hybrid 60fps Performance Activation (Auto-Detect + Manual Toggle)**: The app will automatically detect 32-bit Android architectures (`armv7l`, `armv8l`, `i686`), Fire TV / Android TV WebViews, Downloader by AFTVnews user agents, and low-memory/low-core devices to activate **60fps Butter Mode** (`data-perf-mode="60fps"`), while also providing an explicit one-click toggle in the top Navbar so users can enable or disable it on any device at any time.
- **Virtual Mouse Ergonomics for Downloader by AFTVnews**: Because virtual mouse cursors driven by TV remotes struggle with hidden hover states and small hitboxes, horizontal rail navigation arrows will be enlarged (`48x48px` minimum hit target) and kept **always visible** whenever scrolling is available, paired with **click-and-drag pointer scrolling** (with drag-distance click suppression so dragging a rail never accidentally opens a title).
- **Strict GPU Compositor Pipeline (`transform` & `opacity` Only)**: All card hover/focus states, hero transitions, and page route transitions will exclusively animate GPU-composited properties (`transform: translate3d/scale3d` and `opacity`), eliminating main-thread layout thrashing, full-screen fixed background repaints, and per-frame React state updates during scrolling.

---

## 1. Overview & Core Concept

Streaming interfaces on 32-bit Android TV boxes, Fire TV sticks, and embedded WebViews (such as **Downloader by AFTVnews**) face three distinct hardware constraints:
1. **Limited Tile Memory & Fill-Rate**: `background-attachment: fixed`, multi-layered `backdrop-filter: blur()`, and continuous full-screen ambient keyframe animations force CPU software rasterization and drop scroll frame rates to 15–25fps.
2. **Main-Thread JavaScript Contention**: Firing React state updates (`setScrollProgress`, `setShowLeftArrow`) on every scroll event or wrapping dozens of rail cards in individual spring observers chokes single-core/quad-core 32-bit ARM processors.
3. **Hybrid Remote + Virtual Cursor Input**: Users in Downloader by AFTVnews navigate with an on-screen virtual mouse pointer moved via D-pad arrows, meaning controls that rely on desktop `:hover` to appear or require tiny precision clicks are difficult to use.

Our solution transforms Zoku TV's rendering and interaction engine into a **compositor-first 60fps pipeline** with first-class ergonomics for both D-pad spatial focus and virtual mouse pointers.

---

## 2. User Experience & Visual Design

- **Silky 60fps Vertical & Horizontal Scrolling**:
  - Vertical page scrolling uses hardware-accelerated tiled compositing by replacing `background-attachment: fixed` on the document root with a dedicated, zero-repaint GPU layer and `content-visibility: auto` containment on off-screen rails.
  - Horizontal rail scrolling uses a decoupled `requestAnimationFrame` cubic-bezier glide (`easeOutCubic`) that updates scroll progress directly on the DOM node rather than re-rendering the React component tree on every frame.
- **First-Class Virtual Mouse & Downloader Browser Controls**:
  - **Always-Visible Large Rail Chevrons**: Left and right rail scroll buttons remain clearly visible (unless the rail is already at the exact start or end boundary) with generous `48x48px` hit targets, high-contrast borders, and instant active scale feedback.
  - **Click-and-Drag Rail Gliding**: Users with a virtual mouse cursor can click and drag horizontally anywhere on a rail to scroll smoothly, with automatic momentum and an8px drag guard that prevents accidental card navigation when releasing the mouse button.
  - **Preserved TV Spatial Focus**: Moving the virtual mouse cursor no longer strips away TV optimizations; large focus rings (`focus-visible`) and D-pad arrow navigation coexist seamlessly with virtual cursor clicks.
- **GPU-Composited Page & Card Choreography**:
  - **Page Route Transitions**: Navigating between Home, Discover, Anime, Search, Watchlist, and Title Details triggers a crisp 220ms GPU-composited fade-and-translate (`translate3d(0, 6px, 0)` to `translate3d(0, 0, 0)`) that feels instantaneous and never blocks input.
  - **Card Hover & Focus Elevation**: Cards elevate smoothly using `transform: translate3d(0, -4px, 0) scale(1.02)` and `opacity` transitions with `backface-visibility: hidden`, replacing costly `transition-all` declarations and per-card scroll keyframe animations.
- **Navbar 60fps Mode Indicator & Toggle**:
  - A dedicated performance pill in the header lets users see when **60fps TV Mode** is active (auto-enabled on 32-bit/TV browsers or toggled manually) and switch between Standard and 60fps Butter Mode with immediate visual feedback.

---

## 3. Key Product Decisions & Trade-Offs

- **Direct DOM Progress Bar Mutation vs. React State on Scroll**:
  - *Decision*: Update the rail header's scroll progress bar width via a direct DOM `ref` (`style.transform = scaleX(...)`) and only update React state when boundary booleans (`canScrollLeft`, `canScrollRight`) actually flip.
  - *Rationale*: Eliminates ~60 React re-renders per second during every rail glide, freeing the main thread on 32-bit CPUs to maintain a locked 60fps frame budget (16.6ms/frame).
- **Removing Per-Card Scroll Keyframe Wobble & Staggered Mount Springs**:
  - *Decision*: Remove the CSS keyframe animation that fires on every `.rail-card-slot` when a rail scrolls and replace per-card `framer-motion` mount wrappers in rails with lightweight CSS GPU transitions.
  - *Rationale*: Animating 15–20 cards simultaneously during a scroll gesture invalidates paint layers across the entire rail. Composited CSS transforms keep card interactions buttery without mount or scroll jank.
- **Adaptive Glass & Ambient Layering in 60fps Mode**:
  - *Decision*: When 60fps / TV WebView mode is active, replace heavy multi-pass `backdrop-filter: blur(22px)` and blurred floating orbs with high-contrast, opaque/semi-opaque studio-grade gradient surfaces that preserve the exact dark cinematic aesthetic at zero GPU fill-rate cost.

---

## 4. Technical Architecture & Data Strategy

```
+-----------------------------------------------------------------------------------+
|                   DEVICE & CAPABILITY DETECTION ENGINE                            |
|  • User-Agent & Arch Probe: 32-bit (armv7l/armv8l/i686), AFT*, Silk, Downloader   |
|  • Hardware Probe: hardwareConcurrency <= 4, deviceMemory <= 2, Coarse/TV Pointer |
|  • User Override: Persisted localStorage ("zoku_perf_mode") + Navbar Quick Toggle |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                 ROOT COMPOSITOR ATTRIBUTES (<html> Dataset)                       |
|       data-perf-mode="60fps"   |   data-tv-webview="true"   |   data-tv-mode      |
+-------------------+-----------------------------+---------------------------------+
                    |                             |
                    v                             v
+-----------------------------------+   +-------------------------------------------+
|   GPU RENDERING & CSS PIPELINE    |   |   RAIL SCROLL & VIRTUAL MOUSE ENGINE      |
| • Static GPU background layer     |   | • Zero-re-render rAF scroll loop          |
|   (no background-attachment:fixed)|   | • GPU scaleX() progress bar ref updates   |
| • Strict transform & opacity      |   | • Always-visible 48px Chevron buttons     |
|   transitions (no transition-all) |   | • Pointer click-and-drag + 8px drag guard |
| • Offscreen rail containment      |   | • Coexisting D-pad & Virtual Cursor focus |
+-----------------------------------+   +-------------------------------------------+
```

### Core Engineering Pillars
1. **32-Bit & Downloader Browser Detection + Manual Toggle**:
   - Extend the capability detector to inspect `navigator.userAgent`, `navigator.platform`, `(navigator as any).userAgentData`, `navigator.hardwareConcurrency`, and `navigator.deviceMemory` for 32-bit Android (`armv7l`, `armv8l`, `Linux i686`), Fire OS (`AFTB`, `AFTT`, `AFTS`, `AFTM`, `AFTN`, `AFTR`, `AFTK`, `Silk`), Android WebView (`; wv)`), and `Downloader` identifiers.
   - Expose a global performance context/hook and a persistent toggle button in the top navigation bar so users can switch **60fps Mode** on or off anytime.
2. **Zero-Jank Horizontal Rail Engine (`useSmoothRailScroll`)**:
   - Replace per-frame `setScrollProgress` React state calls with a `progressBarRef` that updates `transform: scaleX()` directly on the GPU compositor thread.
   - Add pointer drag handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onClickCapture`) so users with Downloader's virtual mouse can click-and-drag rails effortlessly while suppressing accidental clicks after a drag (>8px threshold).
   - Ensure `RailNavButton` arrows remain always visible (`opacity-100`) whenever scrolling in that direction is possible, sized at `48x48px` (`h-12 w-12`) for effortless virtual cursor targeting.
3. **Compositor-Only Page & Component Transitions**:
   - Add a lightweight GPU route transition wrapper in the app shell using `transform: translate3d` and `opacity`.
   - Refactor card styles (`TitleCard`, `AnimeCard`, `ContinueWatchingRail`, `WatchHistoryRail`) to replace `transition-all` with `transition-[transform,opacity,border-color]` and hardware-accelerated layer promotion.
