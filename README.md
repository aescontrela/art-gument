# Art-gument API

This project started as an exploration of prompt design and of getting reliable, structured output from an LLM. It's an AI-powered API that stages conversations with iconic 1980s NYC art scene figures: Jean-Michel Basquiat, Keith Haring, Lou Reed, and Richard Hell. Everything is anchored to February 1982, so the characters reference Reagan, the launch of MTV, and CBGBs, never anything after.

The architecture started deliberately simple. A single system prompt acted as the moderator of a four-way conversation, generating one line per call. It evolved into a game interaction model where the user says something, and the moderator plays a whole round, casting the characters line by line until one of them naturally turns the floor back to the user. The decisions themselves come back as schema-constrained tool calls (who speaks, their line, whether the floor turns, and the mood of the room) so everything the model decides is structured data the code can act on. This project touches key concepts behind LLM applications: conversation memory and compaction, prompt design for personality, streaming, and orchestrating a multi-character conversation.

### What I learned

- **Structured output constrains the unit, not the conversation.** Forcing every reply through a schema-constrained tool call made the output reliably parseable, and at first it also meant the dialogue was generated one clean turn at a time, no interruptions, nobody dominating a heated stretch. The fix wasn't dropping the schema but shrinking its unit: one generation now plays a whole round, emitting many schema-valid lines in sequence, so characters answer each other, speak twice when worked up, and hand the floor back when a moment calls for it. The parseability stayed; the dynamics came back.

- **Memory is compaction: a rolling summary plus a verbatim window.** Originally the full history was replayed on every call, so a long enough conversation would exceed the context window and the request would simply fail. Now each generation call sees the last 10 messages verbatim plus a rolling summary of everything older, injected into the system prompt. When enough messages have aged out of the window, they're folded into the summary with one extra (cheaper) model call before the reply is generated, and a watermark column records how far the summary reaches so each message is summarized exactly once. The summarizer is told what to preserve (facts the user revealed, positions taken, how relationships moved) because whatever it drops is forgotten forever: the summary is lossy with no recovery. That trade is deliberate.

- **Personality comes from specifics, not adjectives.** Each character is a structured prompt sheet: who they are in February 1982, how they enter a conversation, sample speech patterns ("Back when I was tagging trains..."), the cultural references they'd actually reach for, and, most importantly, how they relate to each of the other three. Giving Basquiat verbatim phrasings, named places (the Mudd Club, SAMO tags), and a defined tension with the gallery establishment is what made his voice recognizable. The relational part turned out to be the load-bearing piece. The rivalries and alliances written into each sheet are what generate the argument, since the moderator prompt can only surface conflicts that the character sheets already contain: it picks who speaks, but the rivalries themselves have to be written into the characters.

- **Latency compounds, until the round became one call** A conversation round used to be a full round-trip to the model per line, so multi-line exchanges were slow to assemble. Generating the whole round in one call turned out to improve coherence rather than trade it away, because each line is conditioned on the ones before it inside the same generation. Streaming the round back line by line over SSE brought back per-line delivery, and real interruption, since closing the connection aborts generation mid-round.

- **Mood is a side-channel (one reading for the frontend, and an early-warning for the conversation itself).** After every round, a second (cheaper) model call reads the room and reports one of eight moods with an intensity from 1 to 5. The first job is atmospheric: the frontend can expose the climate of the conversation without parsing dialogue. But the reading is stored as structured data, not prose, and that's the second job: a conversation that's stuck announces itself as a mood that stops moving. The same `HEATED` at the same intensity for five straight rounds is a signal code can threshold on, which is what a future moderator would need to steer the party out of a rut instead of letting the characters circle it.

## Features

- PostgreSQL Database
- RESTful API Design
- Zod Validation
- Thread-based Chat System
- AI Character Conversations
- Rolling-Summary Conversation Memory
- Conversation Mood Tracking
- Anthropic Claude Integration

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Yarn package manager
- Anthropic API key

## Quick Start

1. **Clone and install dependencies**

   ```bash
   cd backend
   yarn install
   ```

2. **Set up environment variables**

   ```bash
   cp env-sample .env
   # Edit .env with your values
   ```

3. **Set up database**

   ```bash
   # Create database and user (see Database Setup below)
   yarn migrate
   yarn seed
   ```

4. **Start development server**
   ```bash
   yarn dev
   ```

## Environment Setup

Copy `env-sample` to `.env` and fill in the necessary values, including database credentials for PostgreSQL

## Database Setup

1. **Start your PostgreSQL instance**

2. **Create the database and user** (replace with your actual values):

   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres

   # Create database and user
   DROP DATABASE IF EXISTS artgument_db;
   CREATE ROLE artgument_user WITH LOGIN PASSWORD 'your_secure_password';
   CREATE DATABASE artgument_db OWNER artgument_user;
   GRANT ALL PRIVILEGES ON DATABASE artgument_db TO artgument_user;
   ```

3. **Grant schema privileges**:

   ```bash
   # Connect to your database
   \c artgument_db

   GRANT USAGE ON SCHEMA public TO artgument_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO artgument_user;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO artgument_user;
   ```

4. **Run migrations and seed data**:
   ```bash
   yarn migrate
   yarn seed
   ```

## API Documentation

The OpenAPI spec is generated from the same Zod schemas that validate incoming requests. The API docs are served at [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

The interaction model is a game with two moves, designed around a frontend chat. Posting a user message only stores your question; nothing is generated until you ask for a round. A round streams back as Server-Sent Events: the AI moderator casts the characters line by line (characters answer each other, speak twice when worked up) until a line naturally turns the floor back to the user (marked `floorToUser: true`). Each line arrives as its own event the moment it is generated, so a frontend can show who is typing in real time, and closing the connection aborts generation mid-round.

Every round ends with a mood reading. A second (cheaper) model call reads the last 10 messages, with the rolling summary as background, and reports one of eight moods (`WEARY`, `MELANCHOLY`, `PLAYFUL`, `COCKY`, `ELECTRIC`, `CHAOTIC`, `PRICKLY`, `HEATED`) with an intensity from 1 to 5. The reading is saved on the thread and delivered as the final stream event, e.g. `{ "type": "mood", "mood": { "mood": "PRICKLY", "intensity": 3 } }`. `mood` is `null` when the reading fails: the failure is logged and the round still completes.

Full endpoint documentation, including the SSE event format, lives in [backend/README.md](backend/README.md) and the interactive docs.

### Available Commands

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build production bundle
- `yarn test` - Run tests
- `yarn lint` - Run ESLint
- `yarn migrate` - Run database migrations
- `yarn seed` - Seed database with initial data
