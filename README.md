# ConnectF

ConnectF is a responsive Vietnamese chat-and-meeting MVP built with React, Tailwind CSS, Redux Toolkit, Express, MongoDB, Socket.IO, Docker, and Nginx.

## Run with Docker

1. Copy `.env.example` to `.env` and set `JWT_SECRET` to a unique random value of at least 32 characters.
2. From the project root, run:

   ```powershell
   docker compose up --build
   ```

3. Open [http://localhost:8080](http://localhost:8080). MongoDB data is persisted in the `mongo-data` volume.

On Windows, double-click [`Start-ConnectF.hta`](./Start-ConnectF.hta) to test ConnectF offline without Docker Desktop or MongoDB. It builds the frontend, starts a local JSON-backed server in the background, shows a loading screen, and opens the app when ready. The local server creates its own random JWT secret on first run. Node.js 20+ and project dependencies must already be installed.

For first-time setup, while internet is available, install Node.js 20+ and run `npm install` in `backend/` and `frontend/`. Afterwards, starting and testing the app does not need internet access. Local users, chat messages, groups, and meetings persist in `backend/data/connectf-local.json`; this local demo data is separate from MongoDB data used by Docker. Logs are saved to `%TEMP%\ConnectF-start.log`, `%TEMP%\ConnectF-server.log`, and `%TEMP%\ConnectF-server-error.log`.

For local development, install dependencies in `backend/` and `frontend/`, start MongoDB, then run `npm run dev` in both directories. The Vite development server proxies `/api/*` and `/socket.io/*` to `localhost:5000` by default; set `VITE_API_URL` if your API runs elsewhere. The production Docker setup routes `/api/*`, the unprefixed API routes, and `/socket.io/*` through Nginx.

## API

Protected routes require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Register with username and password |
| POST | `/auth/login` | Log in and receive a JWT |
| GET | `/chat/:roomId` | Read the latest 100 room messages |
| POST | `/chat/send` | Send a text or message metadata payload |
| POST | `/meeting/create` | Create a meeting, optionally with a password |
| POST | `/meeting/join` | Join or enter the waiting room |
| PUT | `/user/update` | Update email, phone, avatar, or password |
| POST | `/group/create` | Create a group and assign its creator as admin |
| POST | `/group/addMember` | Add a username to an admin-managed group |

The same routes are available under `/api/` for the frontend.

## Development and tests

```powershell
cd backend
npm install
npm test

cd ..\frontend
npm install
npm run build
```

The backend emits structured JSON logs with Winston. For non-Docker deployments, `npm run prod` starts PM2 Runtime; the Docker deployment instead uses its container restart policy so development-only process-manager dependencies are not included in the production image. GitHub Actions runs the backend unit tests and builds the frontend on pushes and pull requests.

## Public deployment

The repository includes [`render.yaml`](./render.yaml) for deploying a single HTTPS web service on Render. The Docker image builds the React app and serves it alongside the Express API and Socket.IO from one origin. MongoDB is hosted separately on MongoDB Atlas.

1. Create an Atlas cluster and database user. Copy its `mongodb+srv://...` connection string and replace the placeholder username/password with the database user's credentials.
2. In Render, choose **New → Blueprint**, connect this GitHub repository, and deploy the `render.yaml` blueprint. Render generates `JWT_SECRET` and securely prompts for `MONGODB_URI`; enter the Atlas connection string as a secret, including the database name `connectf`.
3. After Render creates the service, open its **Connect → Outbound** tab and add the listed IP ranges to Atlas **Network Access**. If the first deployment cannot reach MongoDB, redeploy after allowing those ranges. Avoid `0.0.0.0/0`.
4. Wait for Render's deployment and `/health` check to succeed, then open the HTTPS URL Render assigns to the `connectf` service. New commits pushed to the connected branch deploy automatically.

Render's free web services may sleep when idle, so the first request can take longer. Never put the Atlas URI, passwords, or other secrets in GitHub files. GitHub stores the source and runs CI; it does not host MongoDB.

The sidebar no longer contains sample conversations or accounts. Users can find registered accounts by username, start a direct chat, and see groups they actually belong to.

## Current implementation boundary

This is a runnable product foundation, not a production-complete Zalo/Zoom replacement. Authentication, password hashing, profile updates, group creation/admin checks, password-protected meeting creation, persisted chat messages, and Socket.IO chat delivery are implemented. Direct chats use a stable room ID derived from both users so the same conversation opens for either participant.

The meeting screen does not yet connect remote participants: peer-to-peer WebRTC media/signaling and TURN support are not implemented. Local camera, microphone, screen capture, and recording controls only act on the current device. Chat attachments are sent as bounded data URLs rather than durable object storage. Chat is **not end-to-end encrypted**; do not use it for sensitive conversations. Meeting scheduling, breakout rooms, push notifications, group-member removal/admin transfer, and production backups remain product/operations work.
