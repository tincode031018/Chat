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

## Current implementation boundary

This is a runnable product foundation, not a production-complete Zalo/Zoom replacement. User authentication, password hashing, profile updates, group creation/admin checks, password-protected meeting creation, chat persistence, and authenticated Socket.IO chat delivery are implemented. The meeting screen is a responsive interface; actual peer-to-peer WebRTC media/signaling, host approval controls for the waiting room, and meeting scheduling/breakout/recording are not yet implemented. Screen-share permission is requested by the browser, but the captured stream is not yet connected to other participants. File selection currently adds a filename to the message composer; binary upload/storage, voice recording, sticker/GIF search, web push, and group-member removal/admin transfer remain follow-up work. Chat transport is authenticated but is **not end-to-end encrypted**, and room membership authorization/key management must be added before using this for sensitive conversations. Use HTTPS and a strong secret in any deployment; the provided compose file is intended for local development and does not include TLS, backups, or production secret management.
