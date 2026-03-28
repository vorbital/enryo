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
pnpm install        # Install dependencies
pnpm dev            # Run all apps in development mode
pnpm build          # Build all apps
pnpm lint           # Lint all apps
pnpm check          # Type-check all apps
pnpm clean          # Clean build artifacts
```

### App-Specific Commands

```bash
# Web app (apps/web)
cd apps/web && pnpm dev          # Dev server
cd apps/web && pnpm build        # Production build
cd apps/web && pnpm lint         # Lint
cd apps/web && pnpm preview      # Preview build

# Desktop app (apps/desktop)
cd apps/desktop && pnpm dev      # Dev server
cd apps/desktop && pnpm build    # Production build
cd apps/desktop && pnpm tauri   # Run Tauri CLI
```

### Running a Single Test

Currently there are no tests. If adding tests:
- Use **Vitest** (Vite ecosystem)
- Place test files alongside source: `*.test.ts` or `*.test.tsx`
- Run: `pnpm test` (add to package.json as needed)

## Code Style Guidelines

### General Principles

- **No comments** unless explicitly required
- Use **functional components** with hooks
- Keep components small and focused
- Use **early returns** for conditional rendering

### TypeScript

- Always use **explicit types** for parameters and returns
- Use `type` for unions, `interface` for objects
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

Order imports alphabetically within groups (in order):
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
```

### Naming Conventions

- **Files**: PascalCase for components (`ChatPage.tsx`), camelCase for utilities (`api.ts`)
- **Components**: PascalCase
- **Functions/variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for config, camelCase otherwise
- **Types**: PascalCase (`MessageWithAuthor`)

### React Patterns

- Use **named exports** for components
- Destructure props in function signature
- Use `useCallback` for functions passed as props

```typescript
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

```typescript
try {
  const data = await api.channels.get(token, channelId);
  setChannel(data);
} catch (err) {
  console.error('Failed to load channel:', err);
  setError('Unable to load channel. Please try again.');
}
```

### State Management

- **Zustand** for global state (`apps/desktop/src/stores/`)
- Local `useState` for component-specific state
- **React Query** (`@tanstack/react-query`) for server state

```typescript
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
- Use arbitrary values sparingly (`bg-[#1a1a2e]`)
- Avoid inline styles

### Environment Variables

- Use `VITE_*` prefix for Vite env vars
- Never commit secrets (`.env` is gitignored)

```typescript
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
```

### Workspace Color System

The app uses a dynamic color system with CSS variables:
- **Primary color** (`ws-primary-*`): Buttons, borders, titles, accents
- **Background color** (`ws-secondary-*`): Main backgrounds, elevated surfaces
- Background colors use `bg-[var(--bg-primary)]`, `bg-[var(--bg-secondary)]`
- Text uses `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`

### File Structure

```
apps/
  web/src/
    components/    # Reusable UI components
    pages/         # Page-level components
    lib/           # Utilities and API clients
  desktop/src/
    components/
    pages/
    lib/
    stores/        # Zustand stores
packages/types/
  index.ts         # Export all types
```

### Linting & Formatting

- Run `pnpm lint` before committing
- Run `pnpm check` for type-checking
- ESLint config: `eslint.config.js` (flat config)

### Working with Tauri

- Use `@tauri-apps/api` for native features
- Config: `apps/desktop/src-tauri/`
- Run `pnpm tauri dev` for development
- Build with `pnpm tauri build`
