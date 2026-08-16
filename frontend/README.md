<h1 align="center"> TalkHub — Frontend </h1>

<p align="center">
React + Vite client for TalkHub — a real-time chat & video calling app.
</p>

---

## 🧱 Tech Stack

- **React 19** + **Vite 6**
- **React Router 7** — routing
- **TanStack Query 5** — server state / caching
- **Zustand** — lightweight global state (theme)
- **TailwindCSS + DaisyUI** — styling, 32 built-in themes
- **stream-chat / stream-chat-react** — real-time messaging UI
- **@stream-io/video-react-sdk** — real-time video calling
- **Axios** — HTTP client
- **react-hot-toast** — notifications
- **lucide-react** — icons
- **emoji-mart** — emoji picker (lazy-loaded)

---

## 📂 Folder Structure

```
frontend/
├── public/                 # static assets (ringtone, dialtone, talkhub.svg)
├── src/
│   ├── components/         # reusable UI (modals, sidebars, list items...)
│   ├── constants/          # THEMES, LANGUAGES, COUNTRIES
│   ├── hooks/               # auth, login/logout/signup, presence, unread counts
│   ├── lib/                 # api.js, axios.js, streamClient.js, utils.js
│   ├── pages/                # route-level screens
│   ├── store/                 # zustand stores (theme)
│   ├── App.jsx                 # routes + auth guards
│   ├── main.jsx                 # app entry, QueryClient setup
│   └── index.css                # Tailwind + Stream Chat UI overrides
├── .env                     # VITE_STREAM_API_KEY
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

---

## 🔑 Environment Variables

Create a `.env` file in this folder:

```env
VITE_STREAM_API_KEY=your_stream_api_key
```

> The backend must be running (default `http://localhost:5001`) for auth, chat tokens, uploads, and API calls to work — see `src/lib/axios.js` for the base URL logic.

---

## 🏃 Getting Started

```bash
npm install
npm run dev       # starts Vite dev server on http://localhost:5173
```

### Other scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build → `dist/` (also gzip/brotli-compressed via `vite-plugin-compression`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## 🧭 App Flow (quick reference)

1. **`main.jsx`** sets up React Query + Router, then mounts `<App />`.
2. **`App.jsx`** checks `useAuthUser()` and redirects between `/login`, `/onboarding`, and the main app based on auth + onboarding status. All pages are lazy-loaded.
3. Once authenticated, `useOnlineStatus()` keeps a heartbeat going, and `<CallManager />` listens globally for incoming/outgoing call events so a call modal can pop up from anywhere in the app.
4. Chat and presence are powered by a **shared Stream Chat client singleton** (`lib/streamClient.js`) — connected once via `connectStreamUser()` and reused by every hook/page that needs it (`ChatPage`, `useChatChannels`, `useUnreadCounts`, `useOnlinePresence`, `CallManager`).
5. All REST calls to the backend live in **`lib/api.js`** — check there first if you need to see what endpoints the frontend consumes.

---

## 🎨 Theming

Themes are DaisyUI themes listed in `src/constants/index.js` (`THEMES`) and applied via `data-theme` on the root `<div>` in `App.jsx`. The selected theme is persisted to `localStorage` through `store/useThemeStore.js` and can be changed anytime via `components/ThemeSelector.jsx`.

---

## 📄 License
ISC

---

## 👤 Author

**Name:** Harendra Kumar
**Email:** harendra_2401cs61@iitp.ac.in