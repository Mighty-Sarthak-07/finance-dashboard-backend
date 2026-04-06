# Finance Data Processing & Access Control API

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

A production-ready RESTful backend API for finance data processing with role-based access control (RBAC). Built with clean architecture, layered security, and scalability in mind.

---

## Live Demo

> Base URL: [https://finance-dashboard-backend-qmfs.onrender.com/](https://finance-dashboard-backend-qmfs.onrender.com/)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
- [Example Requests & Responses](#example-requests--responses)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Seed Data](#seed-data)
- [Postman Testing Guide](#postman-testing-guide)
- [Design Decisions & Tradeoffs](#design-decisions--tradeoffs)
- [Assumptions](#assumptions)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Overview

This API serves as the backend for a finance management platform. It supports tracking income and expense records, generating dashboard summaries and trends, exporting filtered data as CSV, and managing users — all gated behind a JWT-authenticated, role-based access control system.

Key highlights:

- Role-based middleware enforced on every protected route
- Audit logging on every create, update, and delete action
- CSV export with full filter support
- Dashboard with date range filtering, category breakdowns, and monthly trends
- Soft delete to preserve data history and support recovery
- Health check endpoint exposing DB connectivity, uptime, and memory usage
- Global error handler to prevent stack trace leaks in production
- Request logger middleware on every incoming request
- Admin safety guard — admins cannot modify their own role or deactivate their own account
- Seed script with 40 sample records for immediate local testing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Authentication | JWT (jsonwebtoken) |
| Validation | Zod |
| Password Hashing | bcryptjs |
| CSV Export | json2csv |

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma       # Database models and enums
│   └── seed.js             # Seed script with sample users and records
├── src/
│   ├── routes/
│   │   ├── auth.js         # Register, login, me
│   │   ├── records.js      # Financial record CRUD + CSV export
│   │   ├── dashboard.js    # Summary, trends, category breakdown
│   │   ├── users.js        # User management (admin only)
│   │   └── audit.js        # Audit log access (admin only)
│   ├── middleware/
│   │   ├── auth.js         # JWT verification + role authorization
│   │   ├── validate.js     # Zod schema validation middleware
│   │   └── logger.js       # Request logger
│   ├── services/
│   │   └── auditService.js # Centralized audit log writer
│   ├── prisma.js           # Prisma client singleton
│   ├── app.js              # Express app setup, routes, error handlers
│   └── server.js           # HTTP server entry point
├── .env
├── package.json
└── prisma.config.ts
```

---

## Roles & Permissions

| Permission | VIEWER | ANALYST | ADMIN |
|---|:---:|:---:|:---:|
| Read records | ✅ | ✅ | ✅ |
| Read dashboard | ✅ | ✅ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Update records | ❌ | ✅ | ✅ |
| Delete records (soft) | ❌ | ❌ | ✅ |
| Export CSV | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |

---

## API Reference

### Auth

| Method | Endpoint | Auth Required | Role | Description |
|---|---|:---:|---|---|
| POST | `/api/auth/register` | No | — | Register a new user |
| POST | `/api/auth/login` | No | — | Login and receive JWT |
| GET | `/api/auth/me` | Yes | Any | Get current user profile |

### Records

| Method | Endpoint | Auth Required | Role | Description |
|---|---|:---:|---|---|
| GET | `/api/records` | Yes | All | List records with filters and pagination |
| GET | `/api/records/:id` | Yes | All | Get a single record by ID |
| POST | `/api/records` | Yes | ANALYST, ADMIN | Create a new financial record |
| PATCH | `/api/records/:id` | Yes | ANALYST, ADMIN | Update an existing record |
| DELETE | `/api/records/:id` | Yes | ADMIN | Soft delete a record |
| GET | `/api/records/export` | Yes | ANALYST, ADMIN | Export filtered records as CSV |

**Query Parameters for `GET /api/records` and `GET /api/records/export`:**

| Param | Type | Description |
|---|---|---|
| `type` | `INCOME` \| `EXPENSE` | Filter by record type |
| `category` | string | Filter by category name |
| `from` | ISO date | Start of date range |
| `to` | ISO date | End of date range |
| `search` | string | Search across notes and category fields |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |

### Dashboard

| Method | Endpoint | Auth Required | Role | Description |
|---|---|:---:|---|---|
| GET | `/api/dashboard/summary` | Yes | All | Total income, expenses, net balance |
| GET | `/api/dashboard/trends` | Yes | All | Monthly income vs expense breakdown |
| GET | `/api/dashboard/categories` | Yes | All | Spending/income breakdown by category |

**Query Parameters:**

| Param | Endpoints | Description |
|---|---|---|
| `from` | summary, categories | Start of date range |
| `to` | summary, categories | End of date range |
| `type` | categories | Filter by `INCOME` or `EXPENSE` |

### Users (Admin Only)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|:---:|---|---|
| GET | `/api/users` | Yes | ADMIN | List all users |
| GET | `/api/users/:id` | Yes | ADMIN | Get a user by ID |
| PATCH | `/api/users/:id/role` | Yes | ADMIN | Update a user's role |
| PATCH | `/api/users/:id/status` | Yes | ADMIN | Activate or deactivate a user |

### Audit Logs (Admin Only)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|:---:|---|---|
| GET | `/api/audit-logs` | Yes | ADMIN | List audit logs with filters |

**Query Parameters:**

| Param | Description |
|---|---|
| `entity` | e.g. `FinancialRecord` |
| `action` | `CREATE`, `UPDATE`, or `DELETE` |
| `page` | Page number (default: 1) |

### Health

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| GET | `/health` | No | DB status, uptime, memory, response time |

---

## Example Requests & Responses

### POST `/api/auth/login`

**Request:**
```json
{
  "email": "analyst@finance.com",
  "password": "analyst123"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1abc123",
    "name": "Analyst User",
    "email": "analyst@finance.com",
    "role": "ANALYST",
    "status": "ACTIVE"
  }
}
```

---

### POST `/api/records`

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 4500.00,
  "type": "INCOME",
  "category": "Freelance",
  "date": "2026-04-01",
  "notes": "Website project payment from client"
}
```

**Response `201 Created`:**
```json
{
  "id": "clx2xyz789",
  "amount": 4500,
  "type": "INCOME",
  "category": "Freelance",
  "date": "2026-04-01T00:00:00.000Z",
  "notes": "Website project payment from client",
  "userId": "clx1abc123",
  "deletedAt": null,
  "createdAt": "2026-04-06T10:22:00.000Z",
  "updatedAt": "2026-04-06T10:22:00.000Z"
}
```

---

### GET `/api/dashboard/summary?from=2026-01-01&to=2026-04-06`

**Response `200 OK`:**
```json
{
  "totalIncome": 18500.00,
  "totalExpenses": 9200.00,
  "netBalance": 9300.00,
  "recordCount": 34
}
```

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/finance-api.git
cd finance-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

### 4. Push the Prisma schema to your database

```bash
npx prisma db push
```

### 5. Seed the database

```bash
npm run seed
```

### 6. Start the development server

```bash
npm run dev
```

The server will be running at `http://localhost:5000`.

---

## Environment Variables

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon or any Postgres provider) |
| `JWT_SECRET` | Yes | Secret key used to sign and verify JWTs |
| `PORT` | No | Server port (defaults to `5000`) |

---

## Seed Data

Running `npm run seed` creates the following users and 40 sample financial records for immediate testing:

| Email | Password | Role |
|---|---|---|
| admin@finance.com | admin123 | ADMIN |
| analyst@finance.com | analyst123 | ANALYST |
| viewer@finance.com | viewer123 | VIEWER |

---

## Postman Testing Guide

1. **Import the base URL** — set a Postman environment variable `base_url` to `http://localhost:5000`.

2. **Login** — send a `POST` request to `{{base_url}}/api/auth/login` with valid credentials. Copy the `token` from the response.

3. **Set the Authorization header** — in Postman, go to the Authorization tab, select `Bearer Token`, and paste the token. Or set an environment variable `token` and use `Bearer {{token}}` in your headers.

4. **Test role restrictions** — log in with each seed user (viewer, analyst, admin) and verify that restricted endpoints return `403 Forbidden` for unauthorized roles.

5. **Test filters** — use query params on `GET {{base_url}}/api/records?type=EXPENSE&from=2026-01-01&page=1&limit=5` to verify filtering and pagination.

6. **Test CSV export** — send `GET {{base_url}}/api/records/export` with an ANALYST or ADMIN token. The response will be a downloadable `.csv` file.

7. **Test the health check** — `GET {{base_url}}/health` requires no auth and returns server diagnostics.

---

## Design Decisions & Tradeoffs

**Prisma over raw SQL**
Prisma was chosen for its type safety, auto-generated client, and readable schema definition. It significantly reduces boilerplate and makes the codebase easier to maintain and onboard new developers into. The tradeoff is a slight abstraction overhead compared to hand-tuned SQL queries.

**Application-layer trend computation**
Monthly income vs expense trends are computed in the application layer rather than via raw SQL aggregations. This improves database compatibility (works across Postgres providers without dialect-specific syntax) and makes the logic easier to unit test in isolation.

**Soft delete over hard delete**
Records are never permanently removed. A `deletedAt` timestamp is set instead, and all listing queries filter out soft-deleted records. This preserves the audit trail, supports potential data recovery, and keeps audit logs meaningful.

---

## Assumptions

- ANALYST role can create and update records but cannot delete them — deletion is an admin-only, destructive action.
- JWT tokens expire after 7 days.
- Registration is open by default; a `role` field can optionally be passed in the request body for flexibility during development.
- All record listing endpoints exclude soft-deleted records automatically.
- An admin cannot change their own role or deactivate their own account — this is a safety guard to prevent accidental lockout.
- Pagination defaults to `page=1` and `limit=10` when not specified.

---

## Future Improvements

The following enhancements are planned or under consideration for future releases:

**Security & Reliability**
- Rate limiting and brute force protection on authentication endpoints using `express-rate-limit` to mitigate credential stuffing attacks.
- Refresh token implementation with token rotation to reduce the security risk of long-lived access tokens.

**Testing**
- Comprehensive unit and integration test suite using Jest and Supertest, covering route handlers, middleware, and service logic with mocked Prisma clients.

**Features**
- Budget and spending limits per category with configurable threshold alerts, giving users visibility into overspending in real time.
- Email notifications triggered when spending exceeds defined budget limits, using a transactional email provider such as SendGrid or Resend.
- Granular role permission customization beyond the three built-in roles, allowing fine-grained access control per resource and action.
- File attachments on financial records (receipts, invoices) stored via cloud object storage such as AWS S3 or Cloudflare R2.
- Scheduled reports via cron jobs delivering weekly and monthly financial summaries by email.

**Performance**
- Redis caching layer for dashboard summary and trends endpoints to reduce database load on frequently accessed, computationally heavier queries.

**Developer Experience**
- Swagger / OpenAPI documentation auto-generated from route definitions for interactive API exploration and easier third-party integration.
- Docker and docker-compose setup for fully containerized local development, eliminating environment setup friction.
- CI/CD pipeline with GitHub Actions for automated linting, testing, and deployment on every push to main.

---

## Author

Built by **[Sarthak Kesarwani]**

- GitHub: [@Mighty-Sarthak-07](https://github.com/Mighty-Sarthak-07)
- LinkedIn: [Sarthak Kesarwani](https://www.linkedin.com/in/sarthak-kesarwani-48b4702a7/)
- Email: [sarthak230504@gmail.com](mailto:sarthak230504@gmail.com)

---


