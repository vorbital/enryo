<p align="center">
  <img src="https://raw.githubusercontent.com/vorbital/.github/main/enryo-logo.svg" alt="Enryo" width="200" />
</p>

<h1 align="center">Enryo</h1>

<p align="center">
  The mindful workspace — communication designed for deep work, not distraction.
</p>

<p align="center">
  <a href="https://enryo.app">Live</a> • <a href="https://github.com/vorbital/enryo/releases">Download</a>
</p>

---

## Why Enryo?

Most chat apps are noise machines. Enryo is different — it's built for people who value focus, thoughtful collaboration, and boundaries.

- **Distraction-free by default** — No endless notification ping-pong
- **Threaded conversations** — Keep discussions organized, not scattered
- **Custom workspaces** — Make each space feel like home with theme customization
- **Real-time sync** — WebSocket-powered instant messaging

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, TailwindCSS |
| Desktop | Tauri 2, Zustand |
| Build | Vite, Turbo, pnpm |
| Real-time | WebSockets |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/vorbital/enryo.git
cd enryo

# Install dependencies
pnpm install

# Run both apps in development
pnpm dev

# Or run individually
cd apps/web   && pnpm dev   # Marketing site
cd apps/desktop && pnpm dev # Desktop app
```

## Project Structure

```
enryo/
├── apps/
│   ├── web/         # Public marketing site
│   └── desktop/     # Desktop chat application
└── packages/
    └── types/       # Shared TypeScript definitions
```

## License

Licensed under [PolyForm Noncommercial License 1.0.0](LICENSE). See the [LICENSE](LICENSE) file for details. Commercial use is not permitted.
