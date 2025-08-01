## Summary

A Node.js/Express backend API

- PostgreSQL database with migrations and seeding
- Zod validation for request/response schemas
- Comprehensive error handling with security-first approach
- RESTful API design

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Yarn package manager

## Useful commands:

- `yarn dev` serve locally
- `yarn build` builds the bundle
- `yarn test` runs tests (Not implemented yet)

## Set Up Environment Variables:

- Copy .env-sample to .env
- Fill in the necessary values, including database credentials for PostgreSQL in the backend's .env file.

## Set Up the Database:

- Start your PostgreSQL instance.
- Create the required database (if not already created):

```bash
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
```

Connect to the database as a user with sufficient privileges (e.g., postgres) to grant privileges

```bash
GRANT USAGE ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
```
