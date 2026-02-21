# Personal Chat Application

Full-stack one-to-one personal chat with real-time messaging, online presence, and JWT authentication.

## Structure

- **server/** – Node.js backend (Express, MongoDB, Redis, Socket.io)
- **client/** – Next.js frontend (App Router, TypeScript, TailwindCSS, Zustand)

## Prerequisites

- Node.js 18+
- MongoDB
- Redis

## Setup

### 1. Backend (server)

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:

- `MONGO_URI` – MongoDB connection string (e.g. `mongodb://localhost:27017/chat`)
- `JWT_SECRET` – Random secret for JWT signing
- `REDIS_HOST` – Redis host (default `localhost`)
- `REDIS_PORT` – Redis port (default `6379`)
- `REDIS_PASSWORD` – Leave empty if Redis has no password
- `CLIENT_URL` – Frontend URL (e.g. `http://localhost:3000`)

Run:

```bash
npm run dev
```

Server runs at `http://localhost:5000`.

### 2. Frontend (client)

```bash
cd client
npm install
cp .env.example .env.local
```

Edit `client/.env.local`:

- `NEXT_PUBLIC_API_URL` – Backend API URL (e.g. `http://localhost:5000`)
- `NEXT_PUBLIC_SOCKET_URL` – Backend URL for Socket.io (e.g. `http://localhost:5000`)

Run:

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

### Server

- `npm run dev` – Start with watch mode
- `npm start` – Start production server

### Client

- `npm run dev` – Development server
- `npm run build` – Production build
- `npm start` – Run production build

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/users/me | Current user (protected) |
| GET | /api/users/search?query= | Search users (protected) |
| GET | /api/conversations | List my conversations (protected) |
| GET | /api/messages/:receiverId | Get or create conversation + messages (protected) |
| POST | /api/messages/send/:receiverId | Send message (protected) |

## Features

- Register / login with JWT (HTTP-only cookie)
- Search users by name or email
- One-to-one conversations created on first message
- Real-time messaging via Socket.io
- Online/offline status via Redis
- Message “seen” updates in real time
