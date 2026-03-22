# Agent Guidelines for Enryo

This document provides guidelines for agents working on the Enryo codebase.

## Project Overview

Enryo is a monorepo containing:
- **apps/web**: Public website (React + Vite + TailwindCSS)
- **apps/desktop**: Desktop app (React + Vite + Tauri + Zustand + TailwindCSS)
- **packages/types**: Shared TypeScript types

## Build & Development Commands

### Root Commands (from repository root)

```bash
# Install dependencies
pnpm install

# Run all apps in development mode (hot reloading)
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint

# Type-check all apps
pnpm check

# Clean build artifacts and node_modules
pnpm clean
```

### App-Specific Commands

```bash
# Web app (apps/web)
cd apps/web
pnpm dev          # Start dev server with hot reloading
pnpm build        # Production build
pnpm lint         # Lint this app
pnpm preview      # Preview production build

# Desktop app (apps/desktop)
cd apps/desktop
pnpm dev          # Start dev server with hot reloading
pnpm build        # Production build
pnpm tauri        # Run Tauri CLI commands

# Types package (packages/types)
cd packages/types
pnpm lint         # (echo only, no actual linting)
```

### Running a Single Test

Currently, there are **no tests** in this repository. If you add tests:
- Use Vitest as the test framework (matches Vite ecosystem)
- Place test files alongside source files with `.test.ts` or `.test.tsx` extension
- Run tests with: `pnpm test` (add to package.json as needed)

## Code Style Guidelines

### General Principles

- **No comments** unless explicitly required by the user
- Use **functional components** with hooks, not class components
- Keep components small and focused
- Use **early returns** for conditional rendering

### TypeScript

- Always use **explicit types** for function parameters and return types
- Use `type` for unions, interfaces for objects
- Enable strict mode in tsconfig (already enabled)
- Use `verbatimModuleSyntax` - use `import type` for types only

```typescript
// Good
import { useState } from 'react';
import type { User } from './types';
import { api } from '../lib/api';

function getUser(id: string): Promise<User> {
  return api.users.get(id);
}

// Bad
import * as React from 'react';  // Use named imports
```

### Imports

Order imports alphabetically within groups. Groups (in order):
1. React/core imports
2. External libraries
3. Internal packages (`@enryo/*`)
4. Relative imports (local files)

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import type { Message } from '@enryo/types';

import MessageItem from '../components/MessageItem';
import ContextMenu from '../components/ContextMenu';
```

### Naming Conventions

- **Files**: PascalCase for components (`ChatPage.tsx`), camelCase for utilities (`api.ts`)
- **Components**: PascalCase (`ChatPage`, `MessageItem`)
- **Functions/variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for config values, camelCase otherwise
- **Types/Interfaces**: PascalCase with descriptive names (`MessageWithAuthor`)
- **CSS Classes**: kebab-case (Tailwind utility classes)

### React Patterns

- Use **named exports** for components
- Destructure props in function signature
- Use `useCallback` for functions passed as props
- Use `useRef` for mutable values that don't trigger re-renders

```typescript
// Good
export default function ChatPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = useCallback((text: string) => {
    // ...
  }, [dependency]);

  return <div>...</div>;
}
```

### Error Handling

- Use try/catch for async operations
- Log errors with `console.error`
- Show user-friendly error messages in UI
- Handle WebSocket reconnection explicitly

```typescript
// Good
try {
  const data = await api.channels.get(token, channelId);
  setChannel(data);
} catch (err) {
  console.error('Failed to load channel:', err);
  setError('Unable to load channel. Please try again.');
}

// For WebSocket, handle reconnection
socket.onclose = () => {
  setIsConnected(false);
  reconnectTimeoutRef.current = setTimeout(connect, 3000);
};
```

### State Management

- Use **Zustand** for global state (see `apps/desktop/src/stores/`)
- Use local `useState` for component-specific state
- Use **React Query** (`@tanstack/react-query`) for server state

```typescript
// Store example (apps/desktop/src/stores/auth.ts)
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));
```

### CSS & Styling

- Use **Tailwind CSS** for all styling
- Use semantic class names for layout
- Use arbitrary values sparingly
- Keep custom CSS to a minimum

```typescript
// Good
<div className="flex-1 flex flex-col bg-[#1a1a2e]">
  <h3 className="font-semibold text-white flex items-center gap-2">

// Avoid
<div style={{ display: 'flex', backgroundColor: '#1a1a2e' }}>
```

### Environment Variables

- Use `VITE_*` prefix for Vite environment variables
- Never commit secrets - use `.env` files (already gitignored)
- Provide sensible defaults for development

```typescript
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
```

### File Structure

```
apps/
  web/
    src/
      components/    # Reusable UI components
      pages/         # Page-level components
      lib/           # Utilities and API clients
      stores/        # Zustand stores
  desktop/
    src/
      components/
      pages/
      lib/
      stores/
packages/
  types/
    index.ts         # Export all types
```

### Linting & Formatting

- Run `pnpm lint` before committing
- Run `pnpm check` for type-checking
- ESLint config is in `eslint.config.js` (flat config)
- Prettier is not configured - use ESLint for formatting

### Working with Tauri (Desktop App)

- Use `@tauri-apps/api` for native features
- Tauri config is in `apps/desktop/src-tauri/`
- Run `pnpm tauri dev` for development
- Build with `pnpm tauri build`

## Common Tasks

### Adding a New Page

1. Create file in `apps/*/src/pages/`
2. Add route in `App.tsx`
3. Use `useParams` for route parameters
4. Use stores for authentication/state

### Adding a New Component

1. Create file in `apps/*/src/components/`
2. Use named export
3. Keep it focused and reusable
4. Add to parent component's imports

### Adding New Types

1. Add to `packages/types/index.ts`
2. Use TypeScript interfaces for objects
3. Use type aliases for unions
4. Export for use in other packages

## Notes

- This is a **Vite-based** project, not Next.js
- No SSR (Server-Side Rendering)
- WebSocket for real-time messaging
- Strict TypeScript configuration
- Flat ESLint config (not legacy)
