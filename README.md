# Sunrise Builder CRM

A self-contained Windows-friendly Phase 1–2 CRM project: Next.js client, Spring Boot API, PostgreSQL Compose service, Flyway migrations, and development seed data. Lead, booking, payment, and follow-up workflows are deferred to Phase 3.

## Requirements

- Windows 10/11
- Java **17** LTS (Temurin/OpenJDK 17). Spring Boot 3.3 targets Java 17.
- Node.js 20+ (Node 24 was used for the verified frontend build)
- Docker Desktop, started and set to Linux containers
- Internet on the first API launch so the project-local Maven launcher can download Maven 3.9.10. Global Maven is not required.

## Installation

From the project root in Command Prompt:

```bat
copy .env.example .env
notepad .env
```

Set a development database password and a JWT secret of at least 32 characters. Never commit `.env`.

## One-command startup

Start Docker Desktop, wait until it is running, then execute:

```bat
run-crm.bat
```

It loads `.env`, starts `postgres`, and opens visible API and web terminal windows. On first API startup, `backend\mvnw.cmd` downloads Maven only into `backend\.mvn\wrapper` within this project. Errors remain visible in each terminal.

To stop PostgreSQL:

```bat
stop-crm.bat
```

Close the API and web windows separately. The database persists. To reset development data (destructive):

```bat
docker compose --env-file .env down -v
docker compose --env-file .env up -d postgres
```

## Manual Windows startup

Start and inspect PostgreSQL from the project root:

```bat
docker compose --env-file .env up -d postgres
docker compose --env-file .env ps
```

Start the backend:

```bat
cd backend
mvnw.cmd spring-boot:run
```

The API loads `../.env`; Flyway creates a fresh schema and seed data automatically.

Start the frontend in a second terminal:

```bat
cd frontend
npm install
set NEXT_PUBLIC_API_URL=http://localhost:8080/api
npm run dev
```

## URLs

- CRM: http://localhost:3000
- API: http://localhost:8080/api
- Health: http://localhost:8080/api/health

## Development logins

All seed-only accounts use `ChangeMe!123` and must never be used in production.

| Role | Email |
| --- | --- |
| Admin | admin@sunrise.local |
| Manager | manager@sunrise.local |
| Employee | priya@sunrise.local |
| Employee | arjun@sunrise.local |
| Employee | rahul@sunrise.local |

## Included features

- JWT/BCrypt authentication; Admin, Manager, and Employee access rules
- Project, tower, floor, unit, and inventory APIs
- PostgreSQL persistence, Flyway migration, and development seeds
- Next.js login, dashboard, projects, inventory filtering, and role-aware navigation

## Troubleshooting

- **Docker unavailable:** start Docker Desktop and run `docker version`.
- **A port is in use:** free 5432, 8080, or 3000, or adjust `.env` consistently.
- **Database connection fails:** run `docker compose --env-file .env ps` and ensure `POSTGRES_*` and `DB_*` agree.
- **Node modules missing:** run `cd frontend && npm install`.
- **Java mismatch:** `java -version` must report Java 17.
- **Maven download fails:** confirm TLS access to `repo.maven.apache.org`, remove `backend\.mvn\wrapper\apache-maven-3.9.10`, then retry.
- **Migration validation fails:** reset only development data using the destructive reset command above.
