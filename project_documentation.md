# Project Documentation

## Overview
This project is a full-stack web application featuring an integrated document viewer and an AI-powered chat assistant. Users can upload documents (like PDFs), view them, and interact with a Google Generative AI model (Gemini) capable of answering questions contextually based on the uploaded documents.

---

## Technology Stack
### Frontend
- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **API Client**: Axios
- **File Handling**: React Dropzone

### Backend
- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **AI Integration**: Google Generative AI SDK (`gemini-2.5-flash`)
- **File Storage**: Cloudinary (with Multer)
- **Document Processing**: PDF-Parse
- **Authentication**: JWT & bcryptjs

---

## Architecture & Implementation

The application is structured as a monorepo consisting of two primary directories: `frontend` and `backend`. 

### 1. Backend Components
The backend handles API routing, database interactions, authentication, document processing, and the AI conversational flow. It adheres to an MVC-like architecture.

#### Core Files
- **`src/server.js`**: The main entry point. Initializes the Express application, configures CORS and JSON parsing, connects to the MongoDB database, and registers all API routes.
- **`.env`**: Stores sensitive environment variables such as the `GEMINI_API_KEY`, database URI, and Cloudinary credentials.

#### Models (Database Schemas)
- **`User.js`**: Schema for user management, storing credentials like email and hashed passwords.
- **`Document.js`**: Schema for uploaded documents, tracking the Cloudinary URL, file metadata, and the user who uploaded it.
- **`Conversation.js`**: Schema linking chat messages to a specific user and optionally to an active document.

#### Controllers (Business Logic)
- **`authController.js`**: Handles user registration, login verification, password hashing (`bcryptjs`), and token generation/validation (`jsonwebtoken`).
- **`documentController.js`**: Manages file uploads (using `multer` and `multer-storage-cloudinary`) and performs text extraction using `pdf-parse`.
- **`chatController.js`**: Manages communication with the Google Generative AI model. It formats the prompt (including any attached document context) and returns the AI's response.
- **`conversationController.js`**: Handles CRUD operations for chat histories, ensuring users can resume past sessions.

#### Routes (API Endpoints)
- **`authRoutes.js`**: Exposes `/api/auth` endpoints (e.g., login, register).
- **`documentRoutes.js`**: Exposes `/api/documents` endpoints.
- **`chatRoutes.js`**: Exposes `/api/chat` endpoints for message submission.
- **`conversationRoutes.js`**: Exposes `/api/conversations` for retrieving history.

### 2. Frontend Components
The frontend is built on Next.js utilizing the modern App Router architecture, providing a highly responsive and state-driven user interface.

#### Application Routing & Pages (`src/app`)
- **`layout.tsx` & `ClientLayout.tsx`**: Define the global HTML structure and style imports (`globals.css`).
- **`login/` & `signup/`**: Routing endpoints for user authentication. They contain the UI forms needed to interface with the backend auth endpoints.
- **`dashboard/page.js`**: The core application view. It utilizes the `AuthContext` to protect the route and orchestrates the layout into three sections:
  - Sidebar for navigation and history.
  - Left pane for the `DocumentViewer`.
  - Right pane for the `Chat` interface.

#### UI Components (`src/components`)
- **`Sidebar.js`**: Displays a list of the user's past conversations and uploaded documents. Acts as a navigation hub to switch contexts.
- **`DocumentViewer.js`**: Manages document rendering and includes interactive elements (like React Dropzone) for uploading new files.
- **`Chat.js`**: The conversational interface. Captures user input, displays the message thread, and communicates via the API to fetch AI responses. It maintains awareness of the currently selected document to provide context to the backend.

#### Context & Services (`src/context` & `src/lib`)
- **`AuthContext.js`**: A React Context Provider that manages and distributes the global authentication state (login status, user data) across components.
- **`api.js`**: An Axios client pre-configured to handle communication with the backend API, likely handling dynamic JWT injection for protected requests.
- **`tts.js`**: A text-to-speech utility script that enables the application to read out the AI-generated responses verbally.

---

## Conclusion
This full-stack project is designed to be highly modular and scalable. 
- The **frontend** benefits from Next.js optimizations and a clean component-based structure, resulting in a cohesive dashboard experience split elegantly between document viewing and chatting.
- The **backend** effectively separates data models, external integrations (Cloudinary, Google Gemini), and API definitions, ensuring easy maintenance. 
By deeply integrating document processing with generative AI, the application serves as a robust foundation for a personalized "Doc-QA" or smart-assistant platform.
