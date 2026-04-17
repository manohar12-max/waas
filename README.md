# Pixaflip WaaS (Workshop as a Service)

A multi-tenant platform for managing workshops, student registrations, and learning content.

## Tech Stack

- **Monorepo Management**: `pnpm` workspaces
- **Backend**: NestJS (TypeScript), MongoDB (Mongoose), Cloudinary (Media), BullMQ (Queues), Redis
- **Frontend**: Vite + React, Tailwind CSS, Framer Motion

---

## Getting Started

### 1. Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local or Atlas)
- [Redis](https://redis.io/download/) (Required for backend queues)

### 2. Installation

Clone the repository and install dependencies from the root directory:

```bash
pnpm install
```

### 3. Environment Setup

You need to set up environment variables for both the backend and frontend.

#### Backend
Copy the example environment file and fill in your credentials:
```bash
cp apps/backend/.env.example apps/backend/.env
```
Key variables needed: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`.

#### Frontend
Copy the example environment file:
```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```
Key variables needed: `VITE_API_URL` (usually `http://localhost:3001`).

### 4. Database Seeding (Optional)

To create an initial admin user for testing, run:
```bash
pnpm run seed:admin
```

### 5. Running the Application

You can run both the backend and frontend simultaneously from the root directory:

```bash
pnpm run dev
```

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173 (or as shown in your terminal)

---

## Project Structure

- `apps/backend`: NestJS application handling APIs, Auth, and Business Logic.
- `apps/frontend`: React application using Vite for the user interface.
- `package.json`: Root package file with workspace scripts.