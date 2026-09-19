# Taskflow frontend

The frontend is a React 18 + TypeScript application built with Vite. The original Figma design is available at [PC version adaptation](https://www.figma.com/design/FIH7wTcPrLjTaCaQN7oJEl/PC-version-adaptation).

## Development

From the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Vite serves the app at `http://localhost:5173`. During local development, requests under `/api` are proxied to the backend at `http://localhost:8081`.

## Commands

```bash
npm ci          # Install exactly from package-lock.json
npm run dev     # Start the Vite development server
npm test        # Run Vitest once
npm run build   # Type-check and create a production build
npm run typecheck
```

Keep `package-lock.json` committed and update it with dependency changes. Use npm consistently; `npm ci` is the reproducible install used for clean environments and CI.

## Directory layout

```text
src/
├── app/
│   ├── api/          # HTTP client and task API calls
│   ├── auth/         # Authentication/session gate
│   ├── cache/        # Preferences and IndexedDB cache
│   ├── components/   # Dashboard and task UI components
│   └── tasks/        # types.ts, useTaskFeed, and useTaskEditor
├── assets/           # Static assets
└── styles/           # Global theme and Tailwind styles
api/[...path].mjs     # Vercel API proxy
```
