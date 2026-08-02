# DSync - Real-Time Chat Application

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.x-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Node.js_/_Bun-18.x-339933?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-6.x-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socket.io" alt="Socket.io" />
</p>

A modern, feature-rich real-time chat application built with **Next.js 16 (App Router)**, **Node.js/Bun**, **MongoDB**, and **Socket.io**. DSync provides seamless Instagram-style direct messaging with delivery status indicators, per-user chat deletion, embedded reply previews, typing indicators, and instant real-time sync.

## ✨ Features

- **Real-Time Messaging** - Instant zero-delay message delivery using Socket.io WebSockets and background room broadcasting.
- **Instagram-Style Quoted Replies** - Reply to any message with embedded translucent previews inside chat bubbles and input composer.
- **Per-User Chat Soft Deletion (Instagram Style)** - Clear or delete chats per-user without destroying conversation history for recipients.
- **Seamless Unified Navigation** - Persistent client-side layout prevents socket re-connections, page flickering, or full reloads when switching chats.
- **File & Image Sharing** - Fast file and media uploads powered by Cloudinary integration.
- **Optimized User Search** - 200ms debouncing, in-memory query caching (0ms repeat latency), and online status badges.
- **Message Reactions & Actions** - Like messages with heart animations, edit text messages, copy content, and delete messages.
- **Presence & Status** - Real-time active status, last-seen timestamps, and group membership management.
- **Dark Mode & Responsive UI** - Modern glassmorphism dark aesthetic crafted for desktop and mobile.

## 🚀 Getting Started

### Prerequisites

- **Node.js 18.x** (or higher) or **Bun**
- **MongoDB** database (local instance or MongoDB Atlas)
- **Cloudinary** account (for file and image uploads)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/dsync.git
   cd dsync
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   # or: bun install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   # or: bun install
   ```

4. **Set up environment variables**

   **Backend (`backend/.env`)**:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/dsync
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   FRONTEND_URL=http://localhost:3000
   ```

   **Frontend (`frontend/.env.local`)**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
   ```

5. **Start the development servers**

   Run Backend (from `/backend`):
   ```bash
   npm start
   # or: bun start
   ```

   Run Frontend (from `/frontend`):
   ```bash
   npm run dev
   # or: bun dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
d:\DSync/
├── backend/
│   ├── config/               # Cloudinary & DB configuration
│   ├── middleware/           # Auth middleware (JWT)
│   ├── models/               # Mongoose Schemas (User, Chat, Message)
│   ├── routes/               # Express API routes (auth, chat, message)
│   ├── server.js             # Express server & Socket.io handlers
│   └── package.json
├── frontend/
│   ├── app/                  # Next.js 16 App Router
│   │   ├── globals.css       # Global styles
│   │   ├── layout.jsx        # Root layout with providers
│   │   ├── page.jsx          # Redirect landing
│   │   ├── login/page.jsx    # Authentication login
│   │   ├── register/page.jsx # Authentication register
│   │   └── chat/
│   │       ├── layout.jsx    # Persistent chat layout (prevents page remounts)
│   │       ├── page.jsx      # Chat home (no selection)
│   │       └── [chatId]/page.jsx
│   ├── components/
│   │   └── Chat/
│   │       ├── Chat.jsx          # Main orchestrator
│   │       ├── Sidebar.jsx       # Left sidebar
│   │       ├── ChatList.jsx      # Conversations list with delete actions
│   │       ├── ChatWindow.jsx    # Active conversation window & header options
│   │       ├── MessageInput.jsx  # Input composer & reply banner
│   │       ├── MessageList.jsx   # Paginated message stream
│   │       ├── MessageItem.jsx   # Message bubble with embedded reply
│   │       ├── UserSearch.jsx    # Debounced user search modal
│   │       └── ProfileModal.jsx  # User profile settings
│   ├── context/
│   │   ├── AuthContext.jsx   # JWT state & storage persistence
│   │   └── ThemeContext.jsx  # Theme provider
│   ├── hooks/
│   │   ├── useChat.js        # Chat data management hook
│   │   ├── useSocket.js      # Socket.io connection manager
│   │   └── useMessages.js    # Message pagination & actions
│   ├── lib/
│   │   ├── api.js            # Axios configuration
│   │   └── storage.js        # LocalStorage helpers
│   ├── styles/
│   │   └── chat.css          # Instagram DM theme & dynamic layout
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (`development`/`production`) | No |
| `MONGODB_URI` | MongoDB Atlas / local connection URI | Yes |
| `JWT_SECRET` | Secret key for JWT auth tokens | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary storage cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | No |

### Frontend Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend REST API endpoint (e.g. `http://localhost:5000/api`) | Yes |
| `NEXT_PUBLIC_SOCKET_URL` | Backend Socket.io server (e.g. `http://localhost:5000`) | Yes |

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19** - UI Framework
- **Framer Motion** - Animations & smooth layout transitions
- **Socket.io Client** - WebSockets real-time sync
- **Axios** - HTTP REST requests
- **Lucide React** - Modern vector icons
- **React Hot Toast** - Toast notifications

### Backend
- **Node.js / Bun** - Runtime environment
- **Express.js** - Server framework
- **MongoDB & Mongoose** - Database & ODM
- **Socket.io** - WebSocket server & room management
- **JWT** - Secure authentication
- **Cloudinary & Multer** - Media & file processing

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) for real-time communication
- [Cloudinary](https://cloudinary.com/) for media storage
- [Lucide](https://lucide.dev/) for beautiful icons
- [Framer Motion](https://www.framer.com/motion/) for smooth animations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ using Next.js, Node.js, MongoDB & Socket.io
</p>
