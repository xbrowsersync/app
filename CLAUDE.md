# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run tests (with coverage)
npm test

# Run a single test file
npx jest src/modules/shared/sync/sync.service.spec.ts

# Lint
npm run lint

# Lint and auto-fix
npm run lint:fix

# Build for a platform (dev mode)
npm run build:chromium:dev
npm run build:firefox:dev
npm run build:android:dev

# Watch mode (rebuild on changes)
npm run watch:chromium
npm run watch:firefox
npm run watch:android

# Production build
npm run build:chromium
npm run build:firefox
npm run build:android

# Package for release (builds + zips)
npm run package:chromium
npm run package:firefox
npm run package:android
```

Build output goes to `build/[platform]/`. Packages go to `dist/`.

## Architecture

The app is a **browser bookmark sync tool** built with **AngularJS 1.x + TypeScript**, bundled via Webpack. It targets three platforms: Chromium extensions, Firefox extensions, and Android (via Cordova).

### Module structure (`src/modules/`)

- **`shared/`** — Platform-agnostic core services: `api`, `bookmark`, `crypto`, `sync`, `store`, `settings`, `log`, `network`, `upgrade`, `errors`, `utility`, etc. These are the primary business logic layer.
- **`app/`** — Abstract UI components shared across platforms: `app-main`, `app-search`, `app-bookmark`, `app-login`, `app-settings`, `app-help`, `app-background`, etc. Components here are abstract base classes.
- **`webext/`** — Web extension concrete implementations: `webext-background`, `webext-app`, `chromium/`, `firefox/`, `shared/` (webext-specific bookmark, store, platform, upgrade services).
- **`android/`** — Android/Cordova concrete implementations: `android-app`, `android-shared/` (android-specific bookmark, store, platform, upgrade services).

### Key architectural patterns

- **Platform abstraction**: Core logic in `shared/` and `app/` uses a `PlatformService` interface. Each platform (`webext`, `android`) provides its own concrete implementation (e.g., `WebExtPlatformService`, `AndroidPlatformService`).
- **Abstract components**: UI components in `app/` are abstract classes extended by platform-specific components. For example, `AppMainComponent` is extended by `WebExtAppComponent` and `AndroidAppComponent`.
- **AngularJS DI**: Services use `angular-ts-decorators` (`@Injectable`) and `static $inject` arrays for dependency injection. Services are capitalized in DI tokens (e.g., `'SyncService'`).
- **Sync queue**: In web extensions, the sync queue lives only in the background page context (never in the browser action popup context). See comment in `sync.service.ts`.
- **Store keys**: All persistent storage keys are defined in `StoreKey` enum (`src/modules/shared/store/store.enum.ts`).

### Webpack configs

- `webpack/base.config.js` — Shared config (TypeScript, SCSS, SVG inline, assets, HTML loader, code splitting with vendor chunk).
- `webpack/webext.config.js` — Shared web extension config (extends base).
- `webpack/chromium.config.js` / `webpack/firefox.config.js` / `webpack/android.config.js` — Platform-specific (entry points, manifest copying, etc.).

### Tests

Test files live alongside source as `*.spec.ts`. Jest is configured to look in `src/modules/**/*.spec.ts`. Coverage is collected from `src/modules/**/*.ts`.
