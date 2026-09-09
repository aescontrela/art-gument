# Art-gument API

This project started as an exploration of prompt design and of getting reliable, structured output from an LLM. It's an AI-powered API that enables conversations with iconic 1980s NYC art scene figures: Jean-Michel Basquiat, Keith Haring, Lou Reed, and Richard Hell.

The architecture is deliberately simple. A single system prompt acts as the moderator of a four-way conversation. The problem I wanted to explore is what it takes to generate a believable human conversation around a very specific topic, with distinct personalities and real conversational dynamics: interruptions, rivalries, running tensions. Everything is anchored to February 1982, so the characters reference Reagan, the launch of MTV, and CBGBs, never anything after.

### What I learned

- **Structured output trades away conversational naturalness.** Forcing every reply through a schema-constrained tool call made the output reliably parseable but it also means the dialogue is generated one clean turn at a time. Real arguments have interruptions, overlapping voices, and characters who dominate a heated stretch. A one-speaker-one-line schema can't express any of that.

- **Memory is compaction: a rolling summary plus a verbatim window.** Originally the full history was replayed on every call, so a long enough conversation would exceed the context window and the request would simply fail. Now each generation call sees the last 10 messages verbatim plus a rolling summary of everything older, injected into the system prompt. When enough messages have aged out of the window, they're folded into the summary with one extra (cheaper) model call before the reply is generated, and a watermark column records how far the summary reaches so each message is summarized exactly once. The summarizer is told what to preserve (facts the user revealed, positions taken, how relationships moved) because whatever it drops is forgotten forever: the summary is lossy with no recovery. That trade is deliberate. 

- **Personality comes from specifics, not adjectives.** Each character is a structured prompt sheet: who they are in February 1982, how they enter a conversation, sample speech patterns ("Back when I was tagging trains..."), the cultural references they'd actually reach for, and, most importantly, how they relate to each of the other three. Giving Basquiat verbatim phrasings, named places (the Mudd Club, SAMO tags), and a defined tension with the gallery establishment is what made his voice recognizable. The relational part turned out to be the load-bearing piece. The rivalries and alliances written into each sheet are what generate the argument, since the moderator prompt can only surface conflicts that the character sheets already contain: it picks who speaks, but the rivalries themselves have to be written into the characters.

- **Latency compounds too.** A "conversation round" is a full round-trip to the model per line, so multi-line exchanges are slow to assemble. Batching several lines into one generation would trade some control for speed.

## Features

- PostgreSQL Database
- RESTful API Design
- Zod Validation
- Thread-based Chat System
- AI Character Conversations
- Rolling-Summary Conversation Memory
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

The interaction model is designed around a potential frontend chat, where the user can talk to a single character or to the whole group. Posting a user message only stores your question. Nothing is generated until you explicitly ask for a reply with a moderator message (the AI picks who speaks next) or a character message (a specific character answers). Each call adds one line to the conversation, so repeated moderator calls make the characters argue among themselves.

### Available Commands

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build production bundle
- `yarn test` - Run tests
- `yarn lint` - Run ESLint
- `yarn migrate` - Run database migrations
- `yarn seed` - Seed database with initial data
