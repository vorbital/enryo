# Enryo: Full Implementation Plan

## Overview

Enryo ("The Mindful Workspace") is transforming from a marketing site into a full-stack monorepo containing a marketing website, multi-tenant chat server, and desktop application.

## Architecture

### Monorepo Structure

```
enryo/
├── apps/
│   ├── web/              # Marketing site (existing, React + Vite)
│   ├── desktop/          # Tauri desktop app
│   └── api/              # Rust chat server
├── packages/
│   ├── ui/               # Shared React components
│   └── types/            # Shared TypeScript types
├── crates/
│   ├── core/             # Shared Rust business logic
│   └── db/               # Database schemas/migrations
├── turbo.json            # Turborepo configuration
├── pnpm-workspace.yaml   # pnpm workspace config
└── package.json
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Rust + Axum + Tokio |
| Database | PostgreSQL + sqlx |
| Real-time | WebSockets (tokio-tungstenite) |
| Desktop | Tauri 2.x + React + TypeScript |
| Auth | JWT + argon2 |
| AI | Self-hosted LLM (llama.cpp) |

## Database Schema

### Tables

```sql
-- Workspaces (multi-tenant containers)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channels within workspaces
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    topic TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace memberships (many-to-many)
CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- For similarity search
    is_pertinent BOOLEAN DEFAULT true,
    parent_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- Thread parent
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_channels_workspace ON channels(workspace_id);
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_pertinent ON messages(channel_id, is_pertinent);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
```

### Row-Level Security

PostgreSQL RLS policies ensure workspace isolation:
- Users can only query channels/messages within their workspaces
- JWT contains workspace_id claim for context

## API Design

### REST Endpoints

```
Authentication:
POST   /auth/register     { email, password, display_name }
POST   /auth/login        { email, password } → { token, refresh_token }
POST   /auth/refresh       { refresh_token } → { token }

Workspaces:
GET    /workspaces         → List user's workspaces
POST   /workspaces         { name, slug } → Create workspace
GET    /workspaces/:slug   → Workspace details

Channels:
GET    /workspaces/:slug/channels     → List channels
POST   /workspaces/:slug/channels     { name, topic } → Create channel
GET    /channels/:id                  → Channel details

Messages:
GET    /channels/:id/messages         ?before=&limit= → Paginated messages
POST   /channels/:id/messages         { content } → Create message
GET    /channels/:id/messages/relevant ?before=&limit= → Pertinent only

WebSocket:
WS     /ws?token=JWT&workspace_id=UUID
        → Bidirectional: send_message, edit_message, delete_message
        ← receive_message, message_updated, message_deleted
```

### WebSocket Protocol

```typescript
// Client → Server
{ type: "send_message", channel_id: string, content: string }
{ type: "typing_start", channel_id: string }
{ type: "typing_stop", channel_id: string }

// Server → Client
{ type: "message", message: Message }
{ type: "message_edit", message_id: string, content: string }
{ type: "message_delete", message_id: string }
{ type: "user_typing", channel_id: string, user_id: string }
```

## Desktop Application

### Layout (Discord-like)

```
┌────────────────────────────────────────────────────────────────┐
│  Title Bar (Enryo - Workspace Name)                            │
├─────────┬──────────────────────────────────┬───────────────────┤
│         │                                  │                   │
│ Worksp- │        Message Area               │   Member List     │
│ aces    │                                  │   (optional)       │
│         │  ┌────────────────────────────┐  │                   │
│ ┌─────┐ │  │ Avatar │ Name    │ Time    │  │                   │
│ │ W1  │ │  │        │ Message content   │  │                   │
│ │ W2  │ │  │        │ continues here... │  │                   │
│ │ W3  │ │  └────────────────────────────┘  │                   │
│ └─────┘ │                                  │                   │
│         │  ┌────────────────────────────┐  │                   │
│ [+ Add] │  │ ○ Avatar │ Truncated...    │  │                   │
│         │  └────────────────────────────┘  │                   │
├─────────┼──────────────────────────────────┤                   │
│ Channels│  ┌────────────────────────────┐  │                   │
│ ┌─────┐ │  │ Type a message...          │  │                   │
│ │ #   │ │  └────────────────────────────┘  │                   │
│ │ gen │ │                                  │                   │
│ │ rand│ │                                  │                   │
│ └─────┘ │                                  │                   │
├─────────┴──────────────────────────────────┴───────────────────┤
│  Status: Connected │ User: name │ Settings                     │
└────────────────────────────────────────────────────────────────┘
```

### Message Display

**Normal Message:**
```
┌──────────────────────────────────────────┐
│ [Avatar]  Display Name    12:34 PM       │
│           Message content that can      │
│           span multiple lines and       │
│           wraps naturally within the    │
│           message container.            │
└──────────────────────────────────────────┘
```

**Truncated (Off-Topic) Message:**
```
○ Display Name 12:34 PM
  Truncated message that is...
```

- Small greyed-out avatar (16x16)
- Single line with ellipsis after ~50 chars
- Muted grey text (#6b7280)
- Font size: 11px
- Collapsed to bottom of message area
- Visual indicator (○) instead of avatar

### Navigation

- **Left sidebar (60px):** Workspace icons, add workspace button
- **Workspace panel (200px):** Channel list, member list toggle
- **Main area:** Messages, input
- **Right panel (240px, optional):** Member list, thread view

## AI Off-Topic Detection

### Flow

1. User sends message
2. Backend generates embedding via local LLM server
3. Calculate cosine similarity to channel topic centroid
4. If similarity < threshold (0.5), mark `is_pertinent = false`
5. Return message with pertinence flag
6. Frontend renders based on flag

### Embedding Service

- Local llama.cpp server running on localhost:8080
- Model: Sentence transformers compatible embedding model
- Fallback: keyword-based heuristics if LLM unavailable

### Topic Centroid

- Maintain rolling average of last 100 message embeddings per channel
- Update centroid after each pertinent message
- Initial centroid set from channel name/description

## Build System

### Commands

```bash
# Install all dependencies
pnpm install

# Development
pnpm dev                  # Dev all packages
pnpm --filter @enryo/api dev    # API only
pnpm --filter @enryo/desktop dev # Desktop only
pnpm --filter web dev           # Marketing site only

# Build
pnpm build                # Build all
pnpm --filter @enryo/api build  # Build API (creates binary)

# Desktop
pnpm tauri dev            # Tauri development
pnpm tauri build          # Build .app/.exe
```

### Environment Variables

```bash
# API (.env)
DATABASE_URL=postgresql://user:pass@localhost/enryo
JWT_SECRET=your-secret-key
LLM_SERVER_URL=http://localhost:8080
EMBEDDING_THRESHOLD=0.5

# Desktop
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Phases

### Phase 1: Foundation (Foundation)
- [ ] Create monorepo structure (pnpm workspaces + turbo)
- [ ] Move existing marketing site to `apps/web`
- [ ] Create `packages/types` for shared TypeScript
- [ ] Create `crates/db` with sqlx and migrations
- [ ] Configure shared Tailwind config

### Phase 2: Backend Core (Backend)
- [ ] User registration/login with JWT
- [ ] Workspace CRUD with auth
- [ ] Channel CRUD with workspace scoping
- [ ] Message CRUD with pagination
- [ ] Database connection pooling

### Phase 3: Real-time (RealTime)
- [ ] WebSocket connection handling
- [ ] Broadcast messages to channel subscribers
- [ ] Typing indicators
- [ ] Presence/online status

### Phase 4: LLM Integration (LLM)
- [ ] Connect to local llama.cpp server
- [ ] Generate embeddings for messages
- [ ] Calculate channel topic centroids
- [ ] Implement pertinence scoring
- [ ] Configurable threshold

### Phase 5: Desktop App (Desktop)
- [ ] Tauri project setup
- [ ] Authentication flow (login/session)
- [ ] Workspace/channel navigation
- [ ] Message display (normal variant)
- [ ] Message input and sending
- [ ] WebSocket integration

### Phase 6: Message Display (Messages)
- [ ] Normal message rendering with avatars
- [ ] Truncated message component
- [ ] Sort: pertinent first, then truncated
- [ ] Collapsible truncated section
- [ ] Visual distinction (grey text, smaller font)

### Phase 7: Polish (Polish)
- [ ] User settings (display name, avatar)
- [ ] Workspace invite system
- [ ] Channel creation/management
- [ ] Desktop packaging for macOS/Windows

## Shared Types

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  topic: string | null;
  position: number;
}

interface Message {
  id: string;
  channelId: string;
  author: User;
  content: string;
  isPertinent: boolean;
  parentId: string | null;
  createdAt: string;
}

interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
}
```

## Configuration Files

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "target/release/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Development Guidelines

### Rust Backend
- Use sqlx for compile-time checked queries
- Axum for HTTP + WebSocket
- Tower for middleware (auth, logging)
- serde for serialization

### React Frontend
- React Query for server state
- Zustand for client state
- Tailwind CSS for styling
- shadcn/ui components as base

### Git Workflow
- Branch: `wip` for work-in-progress
- Feature branches off `wip`
- Squash merge to `wip`
- PR from `wip` to `main` for release
