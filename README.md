# EasyMessage - Messaging App (Backend)

## Introduction
EasyMessage is a web app for direct and group messaging, inspired by WhatsApp. It is one of the final projects in the [Odin Project](https://www.theodinproject.com/lessons/nodejs-messaging-app).

The backend is Express 5 and Prisma (PostgreSQL). It exposes a REST API for users, groups and messages, and emits Socket.IO events when a message is created, edited or deleted. Authentication uses JWTs, and passwords are hashed with bcrypt.

## Demo
[The website is live](https://messaging-app-client-eight.vercel.app/). Log in with the demo credentials:
- **username**: guest
- **password**: iamaguest

## Tech
Node.js 20.6+, Express 5, TypeScript, Prisma, PostgreSQL, Socket.IO, Zod, Multer with Cloudinary, Vitest and Supertest. Swagger UI is generated from the Zod schemas.

## Setup
```bash
git clone https://github.com/kiffoh/messaging-app-backend.git
cd messaging-app-backend
npm install
cp .env.example .env     # fill in the values
docker compose up -d db  # local dev database on port 5432
npm run migrate:deploy
npm run dev
```

All variables in `.env.example` are required; the server exits at startup and lists any that are missing (`src/config/env.ts`). `PORT` is optional (default 3000). `.env` is gitignored.

- `DATABASE_URL`: PostgreSQL connection string (the example value matches `docker compose`)
- `FRONTEND_URL`: allowed CORS origin
- `SECRET_KEY`: JWT signing secret
- `DEFAULT_PICTURE`, `DEFAULT_GROUP_PICTURE`: fallback image URLs
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: image uploads

### Scripts
| Script | Does |
|---|---|
| `npm run dev` | dev server (tsx watch, reads `.env`) |
| `npm run build` / `npm start` | compile to `dist/`, run it |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | integration and unit tests (see Testing) |
| `npm run migrate:dev` / `migrate:deploy` | create or apply migrations |
| `npm run db:seed:guest` | demo `guest` account with contacts, groups and messages |
| `npm run db:seed` | sample data (needs users `johndoe` and `janedoe`) |
| `npm run db:reset` | delete all users, groups and messages in the dev database |
| `npm run openapi` | regenerate `openapi.json` |

## API
Interactive docs are served at `/docs` (Swagger UI).

Every route needs `Authorization: Bearer <jwt>` except the two auth routes. The caller is always the user id in the token. Bodies are JSON, except where multipart is noted (the file field is always `photo`).

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /auth/signup` | `{username (1-10 chars), password}` | 201 `{token, user}` | 400, 409, 429 |
| `POST /auth/login` | `{username, password}` | 200 `{token, user}` | 400, 401, 429 |
| `GET /users` | | 200 `[{id, username, photo}]` | |
| `GET /users/:id` | | 200 user profile with `contacts` | 404 |
| `PUT /users/:id` | multipart `{username?, bio?, photo?}` | 200 user profile | 403 not self, 409 |
| `DELETE /users/:id` | | 204 | 403 not self |
| `PUT /users/:id/contacts` | `{contactIds: number[]}` | 200 user profile | 403 not self, 404 |
| `GET /groups` | | 200 the caller's chats, newest first, with `members` and `messages` | |
| `POST /groups` | JSON or multipart `{memberIds, directMsg, name?, bio?, photo?}` | 201 the new chat, or 200 the existing DM | 400, 404 |
| `GET /groups/:id` | | 200 group with `members`, `admins` | 403 non-member, 404 |
| `PUT /groups/:id` | multipart `{name?, bio?, photo?}` | 200 group | 403 non-admin, 404 |
| `DELETE /groups/:id` | | 204, its messages are deleted too | 403 non-admin, 404 |
| `POST /groups/:id/messages` | multipart `{content?, photo?}` | 201 message | 400 empty, 403 non-member, 404 |
| `PUT /groups/:id/messages/:messageId` | `{content}` | 200 message | 403 non-author, 404 |
| `DELETE /groups/:id/messages/:messageId` | | 204 | 403 non-author, 404 |

Notes:
- `POST /auth/*` allows 20 requests per 15 minutes per IP (shared by signup and login), then returns 429 `{message}`. Standard `RateLimit-*` headers are sent.
- `DELETE /users/:id`: groups you were the sole admin of pass to another member, and groups left empty are deleted.
- `POST /groups/:id/messages` returns 404 if the group no longer exists.
- `PUT /users/:id/contacts` adds the given users to the existing contacts.
- `POST /groups`: the caller is always added as a member. For a direct message (`directMsg: true`), `memberIds` must hold exactly one id (not yours: a chat with no other member is 400), concurrent requests for the same pair return the same chat, and `name`, `bio` and `photo` are ignored. For a group the caller becomes admin, and an empty name defaults to the member usernames. In multipart requests send `memberIds` as a JSON string (`"[2,3]"`) and `directMsg` as `"true"` or `"false"`.
- `GET /groups` names unnamed chats for the caller: a DM shows the other member's username and photo.
- A message needs text, a photo or both. User, group and message responses never include passwords.
- Errors are `{message}`. Validation errors (400) are `{message: "Validation failed", errors: [{field, message}]}`.
- User and group profiles also carry `createdAtDate` (`dd-mm-yyyy`) and `createdAtTime` (`hh:mm`), both UTC.

### Socket.IO
Connect with the token: `io(url, { auth: { token } })`. An invalid token is rejected with `unauthorized`. The server disconnects a socket when its token expires. Each socket joins the room `user:<id>`. The server only emits, clients do not send events. These go to every member of the group, including the sender:

| Event | Payload |
|---|---|
| `newMessage` | message |
| `messageUpdated` | message |
| `messageDeleted` | message id (number) |

## Database
Prisma with PostgreSQL, schema in `src/prisma/schema.prisma`, migrations in `src/prisma/migrations`.
- `User`: `username` (unique), hashed `password`, `bio`, `photo`, self-referential `contacts`.
- `Group`: one model for group chats and direct messages (`directMsg` flag), with `members` and `admins`.
- `Message`: optional `content` and `photoUrl`, `authorId` is null if the author's account was deleted.

## Authentication
`POST /auth/signup` and `/auth/login` return a JWT (HS256, expires in 1 hour) and the user. The token claims are `id`, `username`, `bio`, `createdAtDate`, `createdAtTime` and `photo`. Passwords are hashed with bcrypt.

## Testing
Tests run against a throwaway Postgres on port 5433 and never touch the dev database (`resetDb()` refuses any `DATABASE_URL` that does not contain `messaging_app_test`).
```bash
docker compose up -d db-test
npm test
```
`npm test` first applies migrations to the test database (`pretest`), then runs Vitest with `.env.test`. Integration tests in `tests/integration` call the API through Supertest and use `socket.io-client` for the socket events. CI runs the same steps against a Postgres service container.

## Deployment

### Backend Deployment
- **Platform**: Render
  - The backend code is deployed on Render. 
  - Ensure that your application is configured to use the correct environment variables.

### Database
- **Production Database**: Neon
  - The production database is hosted on Neon. Make sure to set up the database correctly and include any necessary connection strings in your environment variables.

### Environment Variables
- After deploying the application, upload the following environment variables to Render:
  - `DATABASE_URL`: The connection string for the Neon database.
  - Other variables as necessary for your application (e.g., API keys, secret keys, etc.)

### Redeployment
- To redeploy after changing environment variables or code, follow these steps:
  1. Navigate to your Render dashboard.
  2. Click on your service.
  3. Click the "Redeploy" button to apply the changes.

### Additional Notes
- Ensure you have configured any necessary CORS settings for your backend to allow communication with the frontend.
- Monitor your logs on Render for any errors that might occur after deployment.
