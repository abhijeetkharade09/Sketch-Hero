# Multiplayer Drawing & Guessing Game

## Overview

This is a real-time, browser-based multiplayer drawing and guessing game similar to skribbl.io. Players join rooms using unique codes, take turns drawing words while others guess, and earn points based on speed and accuracy. The application features a mobile-first responsive design, real-time canvas synchronization, and persistent game data storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using functional components and hooks
- **Routing**: Wouter for lightweight client-side routing (Lobby and GameRoom pages)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Real-time Communication**: Socket.IO client for bidirectional game events (drawing strokes, chat, game state)
- **Drawing**: HTML5 Canvas API with support for mouse and touch events
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for UI transitions, canvas-confetti for celebration effects
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Real-time Engine**: Socket.IO server for game state synchronization and drawing broadcasts
- **API Design**: REST endpoints for non-real-time operations (user creation, room management)
- **Game State**: In-memory storage using JavaScript Maps for active game rooms (production would require Redis for multi-instance scaling)
- **Server Structure**: 
  - `routes.ts` - API endpoints and Socket.IO event handlers
  - `storage.ts` - Database abstraction layer
  - `db.ts` - Drizzle ORM connection pool

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client/server)
- **Tables**: 
  - `users` - Guest players with avatars and cumulative scores
  - `rooms` - Game room configuration and metadata
  - `games` - Active game sessions with round tracking
- **Migrations**: Managed via `drizzle-kit push` command

### Game Flow Design
- Server-authoritative game state to prevent cheating
- Turn-based drawing with word selection phase
- Timed rounds with progressive hint reveals
- Point-based scoring system (faster guesses = more points)
- Host controls for game configuration (rounds, time limits)

### Key Design Decisions
1. **In-memory game state**: Active games stored in memory for low-latency updates; database used for persistence and player stats
2. **Shared schema**: TypeScript types and Zod validation shared between frontend and backend via `@shared/` path alias
3. **Guest authentication**: Simple username-based login stored in localStorage (no password required)
4. **Mobile-first UI**: Responsive layouts with touch support for drawing on mobile devices

## External Dependencies

### Third-Party Services
- **PostgreSQL Database**: Required via `DATABASE_URL` environment variable
- **Socket.IO**: WebSocket-based real-time communication (self-hosted, no external service)

### Key NPM Packages
- `socket.io` / `socket.io-client` - Real-time bidirectional communication
- `drizzle-orm` / `drizzle-kit` - PostgreSQL ORM and migration tooling
- `@tanstack/react-query` - Server state management
- `framer-motion` - Animation library
- `canvas-confetti` - Celebration visual effects
- `zod` / `drizzle-zod` - Runtime validation and schema generation
- `shadcn/ui` components via Radix UI primitives

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (required)
- `NODE_ENV` - Development/production mode detection