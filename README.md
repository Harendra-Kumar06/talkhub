<h1 align="center"> TalkHub — Fullstack Chat & Video Calling App </h1>

<p align="center">
Real-time messaging, 1-on-1 & group video calling, disappearing statuses, and a friend-request based social graph — built on the MERN stack with Stream for chat/video infrastructure.
</p>

![TalkHub Logo](./frontend/public/talkhub.svg)

---

## 🚀 Highlights

- 💬 **Real-time messaging** (1-on-1 + groups) powered by Stream Chat, with reactions, replies, edit/delete, and "delete for me"
- 📹 **1-on-1 and group video calls** with ringing, accept/reject, missed-call detection, and auto-leave logic
- 🔐 **Passwordless-friendly auth** — signup/login with email+password *or* one-time-passcode (OTP) via email, plus forgot-password flow
- 👥 **Friends system** — send/cancel/accept friend requests, remove friends, discover new people
- 🧑‍🤝‍🧑 **Groups** — create groups, promote/demote admins, add/remove members, group video calls
- 📸 **Status / Stories** — 24-hour disappearing image/video updates with view tracking
- 🟢 **Live presence** — real-time online/offline indicators and "last seen" via Stream websockets
- 🔔 **Unread counts** — per-chat and total unread badges, "mark all as read"
- 🎨 **32 DaisyUI themes** with a persistent theme picker
- ⚡ **Performance-minded**: gzip/brotli compression, lazy-loaded routes, `.lean()` Mongo queries, indexed collections, manual Vite chunking

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router 7, TanStack Query, Zustand, TailwindCSS + DaisyUI |
| Chat / Video | `stream-chat`, `stream-chat-react`, `@stream-io/video-react-sdk` |
| Backend | Node.js, Express 4 |
| Database | MongoDB + Mongoose |
| Auth | JWT (httpOnly cookie), bcryptjs password hashing |
| Email (OTP) | Brevo (Sendinblue) transactional email API |
| File uploads | Multer (memory storage) → Stream CDN |

---

## 📂 Project Structure

```
TalkHub/
├── backend/
│   └── src/
│       ├── controllers/   # auth, call, chat, group, status, user
│       ├── lib/           # db, mailer (Brevo OTP emails), stream (Stream Chat SDK)
│       ├── middleware/    # auth.middleware.js (JWT cookie -> req.user)
│       ├── models/        # User, Call, FriendRequest, Group, HiddenMessage, Otp, Status
│       ├── routes/        # auth, call, chat, group, status, user
│       └── server.js
├── frontend/
│   └── src/
│       ├── components/    # CallManager, modals, sidebars, list items, etc.
│       ├── constants/     # THEMES, LANGUAGES, COUNTRIES
│       ├── hooks/         # auth, login, logout, signup, presence, unread counts...
│       ├── lib/           # api.js (all REST calls), axios.js, streamClient.js, utils.js
│       ├── pages/         # Login, SignUp, Friends, Chat, Call, Status, Discover, ...
│       ├── store/         # useThemeStore (zustand)
│       ├── App.jsx        # route table + auth guards
│       └── main.jsx
└── package.json           # root build/start scripts
```

---

## 🔑 Environment Variables

### Backend (`/backend/.env`)

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
JWT_SECRET_KEY=your_jwt_secret
NODE_ENV=development

# Email (OTP) — Brevo
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=you@yourdomain.com
EMAIL_FROM_NAME=TalkHub
APP_NAME=TalkHub
```

### Frontend (`/frontend/.env`)

```env
VITE_STREAM_API_KEY=your_stream_api_key
```

> ⚠️ Never commit real secrets. Rotate any keys that were ever pasted into a chat, terminal log, or public repo.

---

## 🏃 Running Locally

**Backend**
```bash
cd backend
npm install
npm run dev        # nodemon, http://localhost:5001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev         # vite, http://localhost:5173
```

**Production build (from repo root)**
```bash
npm run build        # installs + builds frontend into frontend/dist
npm run start         # serves backend, which also serves frontend/dist in production
```

---

## 🧭 Core Feature Walkthrough

### 1. Authentication
- **Signup**: user submits name/email/password → backend hashes password, stores a temporary `Otp` doc with `pendingData`, emails a 6-digit code (5 min expiry) → user verifies → account is created in `User` collection and a JWT cookie is set.
- **Login**: either classic password login, or "login with OTP" (email a code, verify it, get logged in).
- **Forgot password**: OTP sent to email → verified → new password set (goes through the `pre('save')` bcrypt hook).
- **Session**: JWT stored in an httpOnly cookie (`jwt`), 7-day expiry. `protectRoute` middleware verifies it on every protected request and attaches `req.user`.

### 2. Friends & Discovery
- `GET /api/users` recommends users who aren't already friends and have completed onboarding.
- Friend requests are their own collection (`FriendRequest`) with `pending`/`accepted` status — no request is duplicated in either direction.
- Accepting a request updates both users' `friends` arrays atomically (`$addToSet`, run in parallel).

### 3. Chat
- Every 1-on-1 conversation is a Stream `messaging` channel keyed by the two user IDs (sorted + joined).
- Every group has its own Stream channel (`group-<random>`), kept in sync with the `Group` Mongo document (members, admins, name, avatar).
- "Delete for me" is implemented locally (`HiddenMessage` collection) since Stream's native delete removes for everyone.
- File/image uploads go through the backend (`multer`, 20MB limit) which forwards the buffer to Stream's CDN via a per-user upload channel.

### 4. Calls
- 1-on-1 and group calls are modeled in Mongo (`Call`) for status tracking (ringing/accepted/rejected/missed/ended/cancelled) and use Stream's *signaling channels* (`signal-<userId>`) to push real-time events (`call_incoming`, `call_accepted`, etc.) before the callee ever opens `@stream-io/video-react-sdk`.
- Once a call is accepted, both sides join a Stream Video call room named after the app-level `callId`.
- Leaving a group call doesn't end it for everyone; leaving a 1-on-1 call ends it and posts a system message with duration into the chat.

### 5. Status (Stories)
- Image/video statuses expire automatically via a MongoDB **TTL index** on `expiresAt` (24h after creation) — no cron job needed.
- Viewers are tracked per-status; the friends list is sorted so unviewed statuses surface first.

### 6. Presence & Unread Counts
- `useOnlinePresence` and `useUnreadCounts` both piggyback on the already-open Stream Chat websocket connection rather than polling the REST API, so updates are instant.

---

## 📡 Key API Endpoints (backend)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/signup` → `/verify-signup` | OTP-gated signup |
| POST | `/api/auth/login` / `/login-otp` / `/verify-login-otp` | Password or OTP login |
| POST | `/api/auth/forgot-password` / `/reset-password` | Password reset via OTP |
| GET  | `/api/users` | Recommended (not-yet-friend) users |
| POST | `/api/users/friend-request/:id` | Send friend request |
| PUT  | `/api/users/friend-request/:id/accept` | Accept request |
| GET  | `/api/chat/token` | Stream Chat user token |
| POST | `/api/chat/upload` | Upload file/image to Stream CDN |
| POST | `/api/groups` | Create group (+ Stream channel) |
| POST | `/api/calls/initiate` / `/initiate-group` | Start a call |
| PUT  | `/api/calls/:callId/accept` / `/reject` / `/end` / `/leave` | Call lifecycle |
| GET/POST | `/api/status` | Fetch / create 24h statuses |

---

## 🗺️ Roadmap Ideas
- Typing indicators surfaced in the friend list preview
- Push notifications (currently relies on the app being open)
- Message search
- Screen sharing UI polish on mobile

---

## 📄 License
ISC

---

## 👤 Author

**Name:** Harendra Kumar
**Email:** harendra_2401cs61@iitp.ac.in
**GitHub:** @Harendra-Kumar06
🎓 IIT Patna — B.Tech CSE (2024-2028)