# Agent Context: Matrix Rust SDK Log Visualiser

## Project Overview
A web application for visualizing and analyzing Matrix Rust SDK logs.

## Tech Stack
- **Vite** - Build tool and dev server
- **React 18+** - UI framework
- **TypeScript** - Type safety
- **React Router** - Hash-based navigation for static hosting
- **Zustand** - State management
- **@tanstack/react-virtual** - Virtual scrolling for large log files

## State Management Architecture

**State Library**: Zustand (simple, lightweight state management)

**Global Filters**: 
- `startTime` and `endTime` - time range filters shared across all views
- Synced with URL query parameters (`?start=...&end=...`)
- Managed centrally in Zustand store
- Applied consistently to HTTP Requests view and Sync Requests view

**Data Separation**:
- **Sync-specific state**: `allRequests`, `filteredRequests`, `connectionIds`, `selectedConnId`, `hidePending`
- **HTTP requests state**: `allHttpRequests`, `filteredHttpRequests`, `hidePendingHttp`
- **Shared state**: `startTime`, `endTime`, `rawLogLines`, `expandedRows`, `openLogViewerIds`

**Filtering Strategy**:
- Each view has its own filter function (`filterRequests()`, `filterHttpRequests()`)
- Global time filters trigger re-filtering of both views
- View-specific filters (e.g., connection ID for sync) only affect that view

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

