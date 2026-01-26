# Agent Context: Matrix Rust SDK Log Visualiser

## Project Overview
A web application for visualizing and analyzing Matrix Rust SDK logs.

## Tech Stack
- **Vite** - Build tool and dev server
- **React 18+** - UI framework
- **TypeScript** - Type safety
- **React Router** - Hash-based navigation for static hosting
- **Zustand** - State management (TBD)
- **@tanstack/react-virtual** - Virtual scrolling for large log files

## UX/UI Design

**Target Audience**: Developers debugging Matrix Rust SDK issues

**Core Principles**:
- **Efficiency First**: Fast loading, instant search, no unnecessary clicks
- **Keyboard Shortcuts**: Navigate, search, filter without touching the mouse
- **Shareable URLs**: Deep links to specific requests, time ranges, and filtered views
- **Dark Mode**: Essential for long debugging sessions
- **Copy-Friendly**: One-click copy for request IDs, timestamps, error messages
- **Smart Defaults**: Remember last filters, auto-focus search, sensible view preferences

## How to Launch

### Development
```bash
npm install
npm start
```

### Production Build
```bash
npm run build
npm run preview
```

## How to Test
```bash
npm test            # Unit tests (Vitest)
npm run test:e2e    # End-to-end tests (Playwright)
```
