# 📚 NERD — AI-Powered Study Companion

> An intelligent full-stack web application that lets you upload documents, chat with them using Google Gemini AI, generate quizzes, flashcards, summaries, and much more — all in a beautifully designed, split-pane interface.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Features](#features)
5. [Complex Implementations](#complex-implementations)
6. [API Reference](#api-reference)
7. [Database Models](#database-models)
8. [Getting Started](#getting-started)
9. [Environment Variables](#environment-variables)
10. [Room for Improvement](#room-for-improvement)

---

## Project Overview

**NERD** is a full-stack AI study assistant that bridges the gap between passive document reading and active learning. Users upload PDFs or import web articles, and the AI (powered by Google Gemini) becomes your personal tutor — explaining, quizzing, summarizing, generating flashcards, and answering questions in real time with streaming responses.

The system is built as a classic **monorepo** with two independent services:
- `backend/` — Node.js + Express REST API
- `frontend/` — Next.js 16 React application

---

## Architecture

```
nerd/
├── backend/                  # Express API server (port 5000)
│   └── src/
│       ├── config/           # DB, env, logger, passport (Google OAuth)
│       ├── controllers/      # Business logic (auth, chat, documents, conversations)
│       ├── middleware/        # JWT authentication guard
│       ├── models/           # Mongoose schemas (User, Document, Conversation, Session)
│       ├── routes/           # Express route definitions
│       └── server.js         # Entry point with security stack
│
└── frontend/                 # Next.js app (port 3000)
    └── src/
        ├── app/              # Next.js App Router pages
        │   ├── dashboard/    # Main split-pane workspace
        │   ├── login/        # Auth pages
        │   ├── signup/
        │   ├── profile/
        │   ├── forgot-password/
        │   ├── reset-password/[token]/
        │   ├── auth/callback/ # Google OAuth callback handler
        │   ├── shared/doc/[token]/   # Public shared document view
        │   └── shared/chat/[token]/ # Public shared conversation view
        ├── components/       # UI components (Chat, Sidebar, DocumentViewer, etc.)
        ├── context/          # React context (Auth, Theme, Toast)
        ├── hooks/            # Custom hooks (useClickOutside, useKeyboardShortcuts)
        └── lib/              # API client, TTS utilities
```

**Data flow:**
```
User → Next.js Frontend → Express API → MongoDB Atlas (data)
                                      → Cloudinary (file storage)
                                      → Google Gemini AI (AI responses)
                                      → Passport.js (Google OAuth)
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | JavaScript runtime (ESM modules via `"type": "module"`) |
| **Express.js** | 4.21 | HTTP server and routing framework |
| **MongoDB Atlas** | Cloud | NoSQL database (hosted, replica set) |
| **Mongoose** | 9.3 | MongoDB ODM — schema definitions, validation, `pre('save')` hooks |
| **Google Gemini AI** (`@google/generative-ai`) | 0.24 | The core AI engine. Uses `gemini-2.5-flash` for chat and `gemini-2.0-flash` for document processing |
| **JWT** (`jsonwebtoken`) | 9.0 | Stateless authentication tokens (access token: 7d, refresh token: 7d) |
| **bcryptjs** | 3.0 | Password hashing with salt rounds (10) before storing to DB |
| **Passport.js** + `passport-google-oauth20` | 0.7 | OAuth 2.0 flow for "Sign in with Google" |
| **Cloudinary** | 2.9 | Cloud storage for uploaded PDFs and documents |
| **Multer** | 2.1 | Multipart form-data parser — handles file uploads to temp `uploads/` directory |
| **pdf-parse** | 2.4 | Extracts raw text content from PDF files for AI processing |
| **Cheerio** | 1.2 | Server-side HTML parsing (jQuery-like) — used to scrape and extract text from URLs |
| **Axios** | 1.13 | HTTP client — used to fetch web pages for URL import feature |
| **Helmet** | 8.1 | Sets security-related HTTP headers (XSS protection, HSTS, etc.) |
| **express-rate-limit** | 8.3 | Route-level rate limiting (5 logins/15min, 5 registrations/hour) |
| **express-mongo-sanitize** | 2.2 | Strips `$` and `.` from request bodies to prevent NoSQL injection |
| **validator** | 13.15 | Escapes all string body fields to prevent XSS |
| **express-session** | 1.19 | Session management (required by Passport OAuth flow) |
| **Winston** | 3.19 | Structured logging with file rotation (`logs/`) |
| **Sentry** (`@sentry/node`) | 10.46 | Error tracking and performance monitoring (optional via `SENTRY_DSN`) |
| **crypto** (Node built-in) | — | Generates cryptographically secure random tokens (password reset, share links) |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | React framework with App Router, SSR/CSR, file-based routing |
| **React** | 19.2.3 | UI library — latest stable with concurrent features |
| **TypeScript** | 5+ | Type safety for config files and layout |
| **Tailwind CSS** | 4+ | Utility-first CSS framework — dark mode, responsive design |
| **Framer Motion** | 12.38 | Smooth animations and page transitions |
| **Lucide React** | 0.577 | Consistent icon library (100+ icons used throughout the app) |
| **react-markdown** + **remark-gfm** | 10.1 | Renders Gemini's markdown-formatted responses as rich HTML |
| **react-dropzone** | 15.0 | Drag-and-drop file upload zone with file type validation |
| **prism-react-renderer** | 2.4 | Syntax-highlighted code blocks inside AI chat responses |
| **Sentry** (`@sentry/nextjs`) | 10.46 | Frontend error tracking |
| **Web Speech API** (browser native) | — | `SpeechRecognition` for voice-to-text input; `SpeechSynthesis` for text-to-speech output |

---

## Features

### Authentication & User Management
- **Email/Password registration** with strong password validation (uppercase, lowercase, number, special char, min 8 chars)
- **Email verification** via token (stored in DB, sent to user)
- **Login with "Remember Me"** — issues refresh token for persistent sessions
- **Token refresh** — access tokens silently refreshed using stored refresh token
- **Google OAuth 2.0** — one-click sign-in that auto-creates accounts and links existing email accounts
- **Forgot / Reset Password** — SHA-256 hashed token stored in DB, expires in 15 minutes
- **Active session management** — view all logged-in devices (browser + OS detected from User-Agent), revoke individual or all sessions
- **Profile update** — change name and email
- **Change password** — validates current password before allowing change
- **Delete account** — password-confirmed permanent deletion with cascade session cleanup

### Document Management
- **PDF upload** — text extracted server-side via `pdf-parse`, file stored on Cloudinary
- **Plain text upload** — `.txt` files read directly
- **URL import** — paste any URL; server fetches, parses HTML (Cheerio), and extracts readable article text
- **AI-powered auto-tagging** — Gemini generates 3–5 relevant tags and a category for every document
- **Document versioning** — re-uploading a file with the same name creates a version history; restore any past version
- **Rename documents** — update display name without re-uploading
- **Full-text search** — searches document names, extracted text, and tags with snippet preview
- **Annotations** — add color-coded text annotations to documents (stored in DB)
- **Sharing** — generate a public shareable link via a unique `shareToken` (32-byte random hex)
- **Delete** — removes document from both MongoDB and Cloudinary

### AI Chat
- **4 AI Personas / Modes:**
  - 🤖 **Assistant** — General helpful study assistant
  - 🎓 **Tutor** — Explains step-by-step, asks follow-up comprehension questions
  - 👁️ **Critic** — Critically reviews and identifies gaps in the document
  - 💡 **Explainer** — Breaks everything down into simple, jargon-free language
- **Streaming responses** — AI tokens are streamed via Server-Sent Events (SSE), appearing word-by-word in real time
- **Stop generation** — AbortController lets users halt mid-stream
- **Regenerate** — re-sends the last user message to get an alternative response
- **Context window** — last 10 messages of conversation history are included in every prompt
- **Follow-up questions** — AI appends 2–3 suggested next questions after each response
- **Document-grounded chat** — entire extracted document text is injected into the prompt context

### AI Study Tools (document-required)
- **Summarize** — generates a structured summary of the document (up to 15,000 chars)
- **Study Notes** — produces organized bullet-point notes with headings
- **Quiz Generator** — creates 5 questions: multiple choice, true/false, and short answer — with answers
- **Flashcard Generator** — produces 10 front/back flashcards for key terms
- **Grammar Check** — checks and corrects grammar for selected text
- **Translation** — translates text to any target language

### Voice Features
- **Voice input** — uses browser `SpeechRecognition` API, supports 18 languages (English, Spanish, French, Mandarin, Hindi, Arabic, Japanese, etc.)
- **Text-to-speech** — reads AI responses aloud using browser `SpeechSynthesis`, voice selectable by language and voice name

### Conversation Management
- Auto-created on first message, titled by first 50 chars of user message
- Folder organization
- Shared conversations (public link via `shareToken`)
- Export chat as `.md` or `.txt` file

### UI/UX
- **Dark mode** — full dark/light theme toggle (persisted via `ThemeContext`), keyboard shortcut `Ctrl+D`
- **Keyboard shortcuts** — `Ctrl+Enter` to send, `Ctrl+N` for new conversation, `Ctrl+K` to focus input, `Escape` to close modals
- **Skeleton loading** — animated placeholders while data loads
- **Split-pane layout** — document viewer on left (50%), chat on right (50%)
- **Toast notifications** — success/error/info feedback via `ToastContext`
- **Responsive sidebar** — collapsible on mobile
- **Error boundary** — catches React render errors gracefully

---

## Complex Implementations

### 1. Real-Time AI Response Streaming (SSE)

One of the most technically challenging parts. Instead of waiting for the full AI response (which can take 5–10 seconds), tokens are streamed as they're generated.

**Backend** (`chatController.js`):
```js
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
});

const result = await model.generateContentStream(prompt);
for await (const chunk of result.stream) {
  res.write(`data: ${JSON.stringify({ token: chunk.text() })}\n\n`);
}
res.write(`data: ${JSON.stringify({ done: true, followUpQuestions })}\n\n`);
res.end();
```

**Frontend** (`lib/api.js` → `Chat.js`): The client reads the SSE stream with `ReadableStream`, accumulates tokens in a `ref`, and does a React state update per chunk — showing text appearing live. An `AbortController` is passed to allow mid-stream cancellation.

### 2. Google OAuth with Account Linking

The Passport.js strategy handles three cases in one flow:
1. **Existing Google user** → find by `googleId`, return user
2. **Existing email user** → link Google ID to their account, mark email verified
3. **New user** → create account with a random password (they can set one later)

After authentication, the backend redirects to the frontend with a JWT token embedded in the URL query string, which the `/auth/callback` page on the frontend extracts and stores in `localStorage`.

### 3. Document Upload Pipeline

```
User picks file → Multer writes to /uploads/ (temp) 
→ pdf-parse extracts text 
→ Cloudinary uploads the file 
→ Gemini AI generates tags + category 
→ Check if document already exists (versioning logic)
→ MongoDB saves document record 
→ Temp file deleted (fs.unlinkSync)
→ Response returned to client
```

If a file with the same `originalName` already exists for that user, the current document data is pushed into the `versions` array and the main document record is updated — creating an automatic version history without any user action.

### 4. URL Import with Web Scraping

The `importFromUrl` endpoint:
- Validates URL (HTTP/HTTPS only, malformed URL rejected)
- Fetches the page with Axios (custom User-Agent, 15s timeout)
- Loads HTML into Cheerio and removes noise (`script`, `style`, `nav`, `header`, `footer`, `iframe`)
- Tries semantic containers first (`article`, `main`, `.content`, `[role="main"]`), falls back to all `<p>`, `<h1-h6>`, `<li>` tags
- Rejects pages with less than 100 characters of extracted content
- Runs the text through Gemini for auto-tagging
- Saves as a plain-text document

### 5. Multi-Layered Security Stack

```
Request arrives
  ↓ Helmet (sets 15+ security headers)
  ↓ CORS (whitelist frontend origin only)
  ↓ JSON body parser (10MB limit)
  ↓ express-mongo-sanitize (strip $ and . from body)
  ↓ validator.escape (HTML-encode all string fields → XSS prevention)
  ↓ express-session (Passport OAuth state)
  ↓ Rate limiters (per route, per window)
  ↓ authMiddleware (verify JWT Bearer token)
  ↓ Controller
```

### 6. Password Reset with SHA-256 Token Hashing

Raw token is never stored in the database:
```js
const resetToken = crypto.randomBytes(32).toString('hex'); // sent to user
user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex'); // stored
user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
```
When the user visits the reset link, the raw token from the URL is hashed again and matched against the DB — so even if the DB is compromised, tokens can't be used.

### 7. Follow-Up Question Parsing from AI Response

The AI is instructed to append `[FOLLOWUP: Q1 | Q2 | Q3]` at the end of its response. After streaming completes, the frontend:
1. Strips the `[FOLLOWUP: ...]` tag from the displayed content using regex
2. Extracts and splits the questions by `|`
3. Renders them as clickable suggestion pills that auto-send when clicked

---

## API Reference

### Authentication — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Create account |
| POST | `/login` | ❌ | Login, returns JWT + refresh token |
| POST | `/refresh-token` | ❌ | Issue new access token via refresh token |
| GET | `/me` | ✅ | Get current user profile |
| PUT | `/profile` | ✅ | Update name/email |
| PUT | `/change-password` | ✅ | Change password |
| POST | `/forgot-password` | ❌ | Request password reset |
| POST | `/reset-password/:token` | ❌ | Complete password reset |
| POST | `/verify-email` | ❌ | Verify email with token |
| POST | `/resend-verification` | ❌ | Resend verification email |
| DELETE | `/delete-account` | ✅ | Permanently delete account |
| GET | `/sessions` | ✅ | List active sessions |
| DELETE | `/sessions/:sessionId` | ✅ | Logout a specific session |
| DELETE | `/sessions` | ✅ | Logout all other sessions |
| GET | `/google` | ❌ | Initiate Google OAuth |
| GET | `/google/callback` | ❌ | Google OAuth callback |

### Documents — `/api/documents`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/upload` | ✅ | Upload PDF or TXT file |
| POST | `/import-url` | ✅ | Import document from URL |
| GET | `/` | ✅ | List all user documents |
| GET | `/search?q=` | ✅ | Full-text search |
| GET | `/:id` | ✅ | Get single document |
| DELETE | `/:id` | ✅ | Delete document |
| PUT | `/:id/rename` | ✅ | Rename document |
| PUT | `/:id/annotations` | ✅ | Update annotations |
| GET | `/:id/versions` | ✅ | Get version history |
| POST | `/:id/restore/:versionId` | ✅ | Restore a version |
| POST | `/:id/share` | ✅ | Generate share link |
| DELETE | `/:id/share` | ✅ | Remove share link |
| GET | `/shared/:token` | ❌ | View shared document (public) |

### Chat — `/api/chat`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/message` | ✅ | Send message (SSE streaming response) |
| POST | `/summarize` | ✅ | Summarize a document |
| POST | `/explain` | ✅ | Explain a concept |
| POST | `/grammar-check` | ✅ | Grammar/spelling correction |
| POST | `/generate-notes` | ✅ | Generate study notes |
| POST | `/translate` | ✅ | Translate text |
| POST | `/generate-quiz` | ✅ | Generate quiz from document |
| POST | `/generate-flashcards` | ✅ | Generate flashcards from document |

### Conversations — `/api/conversations`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | List all conversations |
| GET | `/:id` | ✅ | Get single conversation with messages |
| DELETE | `/:id` | ✅ | Delete conversation |
| POST | `/:id/share` | ✅ | Share conversation |
| GET | `/shared/:token` | ❌ | View shared conversation (public) |

### Health Check
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Returns server status, uptime, and DB connection state |

---

## Database Models

### User
```
email, password (bcrypt), name, avatar, isEmailVerified, lastLogin,
verificationToken, resetPasswordToken, resetPasswordExpire,
refreshToken, refreshTokenExpire, googleId
```

### Document
```
user (ref), filename, originalName, cloudinaryUrl, publicId,
extractedText, mimeType, tags[], category,
versions[] { versionNumber, filename, cloudinaryUrl, publicId, extractedText, uploadedAt },
annotations[] { text, color, createdAt },
shareToken, isShared
```

### Conversation
```
user (ref), title, document (ref), messages[] { role, content, timestamp },
folder, shareToken, isShared
```

### Session
```
userId (ref), token, browser, os, device, ip, expiresAt, isCurrent, lastActive
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)
- Google Gemini API key
- Google Cloud Console project (for OAuth)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values (see below)
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
```

The app will be running at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## Environment Variables

### Backend (`.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret        # optional, falls back to JWT_SECRET
SESSION_SECRET=your_session_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GEMINI_API_KEY=your_gemini_api_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
NODE_ENV=development

SENTRY_DSN=                                   # optional
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> ⚠️ **MongoDB Atlas:** Make sure your current IP is whitelisted in Atlas → Security → Network Access. For development, you can allow all IPs with `0.0.0.0/0`.

---

## Room for Improvement

### 1. Email Delivery
Currently the backend generates email verification and password reset tokens but **does not send actual emails** — tokens are returned in the API response in development mode. Integrating a service like **Nodemailer + Gmail**, **SendGrid**, or **Resend** would make these flows fully functional.

### 2. Real PDF Viewer
The current document viewer displays extracted plain text. Integrating **PDF.js** or **react-pdf** would render the actual PDF with pagination, exact formatting, and inline highlights — significantly improving the reading experience.

### 3. WebSocket for Real-Time Collaboration
Currently, only one user can view a document. **Socket.io** could enable real-time collaborative annotations, live cursors, and shared sessions — like Google Docs.

### 4. Semantic Search with Vector Embeddings
The current search is regex-based over raw text. Using **Gemini Embeddings** or **MongoDB Atlas Vector Search** would enable semantic search — "find documents about machine learning" would return relevant results even without exact keyword matches.

### 5. Rate Limiting for AI Endpoints
Chat and document AI endpoints are currently unrated — a user could trigger hundreds of Gemini API calls. Adding per-user rate limits (e.g., 20 AI requests/hour) would both control costs and prevent abuse.

### 6. Refresh Token Rotation Security
The current refresh token is stored in MongoDB. For better security, it should be stored in an **httpOnly cookie** (not localStorage) and implement **token rotation** — each use of a refresh token issues a new one and invalidates the old one.

### 7. Background Queue for Heavy Operations
Document upload triggers PDF parsing + 2 Gemini API calls (tags + category) synchronously, which can take 3–5 seconds. A message queue like **BullMQ** (Redis-backed) would process these in the background and notify the frontend via WebSocket or polling.

### 8. Offline Support
Adding a **Service Worker** and caching recently viewed documents would allow offline reading. The PWA pattern with a `manifest.json` would also enable "Add to Home Screen" for mobile users.

### 9. Analytics Dashboard
A per-user analytics view showing study time, documents read, conversations per document, and quiz scores over time — giving learners insight into their progress.

### 10. Mobile App
The web app is responsive but a native **React Native** app would provide a better mobile experience with native file pickers, push notifications when AI finishes processing, and better voice input integration.

---

## Security Notes

- All passwords are hashed with bcrypt (10 salt rounds) before storage
- Password reset tokens are SHA-256 hashed in the DB — raw tokens are never stored
- All request body strings are HTML-escaped (XSS prevention)
- MongoDB query injection is prevented via `express-mongo-sanitize`
- HTTP security headers are managed by `helmet`
- CORS is locked to the configured `FRONTEND_URL`
- Rate limiting is applied at the route level, stricter on auth endpoints

---

*Built with ❤️ using Node.js, Next.js, MongoDB, and Google Gemini AI*
