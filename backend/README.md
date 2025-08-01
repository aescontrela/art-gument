## Set Up the Database:

- Start your PostgreSQL instance.
- Create the required database (if not already created):

```bash
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
```

Connect to the database as a user with sufficient privileges (e.g., postgres) to grant privilegies

```bash
GRANT USAGE ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
```

ss
