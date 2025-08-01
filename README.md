# Art-gument API

An AI-powered chat application backend that enables conversations with iconic 1980s NYC art scene figures. Users can engage in authentic conversations with Jean-Michel Basquiat, Keith Haring, Lou Reed, and Richard Hell, powered by Anthropic's Claude AI.

## Features

- PostgreSQL Database
- RESTful API Design
- Zod Validation
- Thread-based Chat System
- AI Character Conversations
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

### Chat API

- `POST /api/threads` - Create new conversation thread
- `GET /api/threads/:id` - Get thread messages and history
- `POST /api/threads/:id/messages` - Send message to thread
- `POST /api/threads/:id/conversation-rounds` - Generate character responses

### Character System

Available characters:

- `BASQUIAT` - Jean-Michel Basquiat
- `KEITH_HARING` - Keith Haring
- `LOU_REED` - Lou Reed
- `RICHARD_HELL` - Richard Hell

### Example Usage

**Create a new conversation thread:**

```bash
curl -X POST http://localhost:3000/api/threads \
  -H "Content-Type: application/json"
```

**Send a user message:**

```bash
curl -X POST http://localhost:3000/api/threads/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "message": "Tell me about your experience in the NYC art scene"
  }'
```

**Generate character responses:**

```bash
curl -X POST http://localhost:3000/api/threads/1/conversation-rounds \
  -H "Content-Type: application/json"
```

**Get thread history:**

```bash
curl http://localhost:3000/api/threads/1
```

## Development

### Available Commands

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build production bundle
- `yarn test` - Run tests (not implemented yet)
- `yarn lint` - Run ESLint
- `yarn migrate` - Run database migrations
- `yarn seed` - Seed database with initial data
