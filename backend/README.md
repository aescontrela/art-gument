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

## Tests

The tests run against a separate database. Jest loads `.env.test` and runs the migrations before the suite starts.

1. **Create the test database and user** (replace with your actual values):

   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres

   # Create database and user
   DROP DATABASE IF EXISTS artgument_test_db;
   CREATE ROLE artgument_test_user WITH LOGIN PASSWORD 'your_secure_password';
   CREATE DATABASE artgument_test_db OWNER artgument_test_user;
   GRANT ALL PRIVILEGES ON DATABASE artgument_test_db TO artgument_test_user;
   ```

2. **Grant schema privileges**:

   ```bash
   # Connect to your database
   \c artgument_test_db

   GRANT USAGE ON SCHEMA public TO artgument_test_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO artgument_test_user;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO artgument_test_user;
   ```

3. **Set up the test environment variables**

   ```bash
   cp env-sample .env.test
   # Edit .env.test with the test database credentials
   ```

4. **Run the tests**
   ```bash
   yarn test
   ```

## API Documentation

The OpenAPI spec is generated from the same Zod schemas that validate incoming requests. With the server running, the interactive docs are served at `/api/docs`.

### Chat API

The conversation is a game with two moves: the user says something, and the party plays a **round**. The AI moderator casts the characters line by line until one of them naturally turns the floor back to the user.

- `POST /api/chat/thread` - Create a new conversation thread, returns its ID
- `GET /api/chat/thread/:id` - Get the thread with its summary, last mood reading (`mood` and `intensity`, `null` until the first round) and full message history
- `POST /api/chat/thread/:id/message` - The user's turn: stores the message, generates nothing
- `POST /api/chat/thread/:id/round` - The party's turn: streams a round of dialogue as Server-Sent Events

`POST /api/chat/thread/:id/message` takes `{ "message": "..." }` and responds with the updated history:

```json
{
  "messages": [
    {
      "id": "0b9c1f5e-6a5d-4c59-9d0b-3f1f4c1c2a77",
      "author": "user",
      "message": "...",
      "threadId": 1,
      "createdAt": "2026-09-27T18:04:11.000Z"
    }
  ],
  "mood": null
}
```

`POST /api/chat/thread/:id/round` takes no body and responds with a `text/event-stream`: one `data: <json>` frame per event, as the model generates them.

```
data: {"type":"line","line":{"character":"RICHARD_HELL","response":"...","reasoning":"...","floorToUser":false}}

data: {"type":"line","line":{"character":"KEITH_HARING","response":"...","reasoning":"...","floorToUser":true}}

data: {"type":"mood","mood":{"mood":"PRICKLY","intensity":3}}
```

- Each `line` event is one line of dialogue, already persisted to the thread. The final line of a round carries `floorToUser: true` — the moment the party hands the conversation back to the user.
- The stream ends with one `mood` event (the refreshed reading, or `null` if the reading failed).
- A failure mid-stream emits `{"type":"error"}` and closes; lines already streamed stay persisted.
- Closing the connection aborts generation; lines already streamed stay persisted.
- Errors before the first frame are plain JSON responses: `404` for an unknown thread, `409` if a round is already in progress for the thread.

### Character System

Available characters:

- `BASQUIAT` - Jean-Michel Basquiat
- `KEITH_HARING` - Keith Haring
- `LOU_REED` - Lou Reed
- `RICHARD_HELL` - Richard Hell

### Conversation Memory

Each generation call sees the last 10 messages verbatim plus a rolling summary of everything older. When enough messages have aged out of that window, they are folded into the summary before the reply is generated.

### Conversation Mood

After every round, a second model call reads the last 10 messages, with the rolling summary as background, and reports the mood of the room. The reading is saved on the thread (`mood` and `intensity` columns) and delivered as the round's final stream event.

- `mood` is one of the values below
- `intensity` goes from 1 (a faint undertone) to 5 (it has taken over completely)

| Mood         | The room is...                                                   |
| ------------ | ---------------------------------------------------------------- |
| `WEARY`      | deflating: short answers, trailing off                           |
| `MELANCHOLY` | heavy and wistful: dead friends, the scene changing              |
| `PLAYFUL`    | teasing without stakes: bits and puns landing                    |
| `COCKY`      | swaggering: the group crowning itself                            |
| `ELECTRIC`   | at peak energy with coherence: fast riffing, everyone leaning in |
| `CHAOTIC`    | at high energy without coherence: crossed threads, non-sequiturs |
| `PRICKLY`    | tense under the banter: jabs with edges, no open fight yet       |
| `HEATED`     | in an open fight: direct attacks, escalation                     |

`mood` is `null` when:

- the response is to a user message, since the mood is only read after a round
- the mood reading fails. The failure is logged and the round still completes, the thread keeps its previous mood

### Example Usage

**Create a new conversation thread:**

```bash
curl -X POST http://localhost:3000/api/chat/thread \
  -H "Content-Type: application/json"
```

**Send a user message:**

```bash
curl -X POST http://localhost:3000/api/chat/thread/1/message \
  -H "Content-Type: application/json" \
  -d '{ "message": "Tell me about your experience in the NYC art scene" }'
```

**Play a round (watch the stream with `-N`):**

```bash
curl -N -X POST http://localhost:3000/api/chat/thread/1/round
```

**Get thread history:**

```bash
curl http://localhost:3000/api/chat/thread/1
```

## Development

### Available Commands

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build production bundle
- `yarn test` - Run tests
- `yarn lint` - Run ESLint
- `yarn lint:fix` - Run ESLint and fix what it can
- `yarn format` - Format the code with Prettier
- `yarn format:check` - Check the formatting without writing
- `yarn migrate` - Run database migrations
- `yarn seed` - Seed database with initial data
