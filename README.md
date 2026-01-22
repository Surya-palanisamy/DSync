# DSync - Real-Time Chat Application

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react" alt="React" />
  
  <img src="https://img.shields.io/badge/MongoDB-6.x-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socket.io" alt="Socket.io" />
</p>

A modern, feature-rich real-time chat application built with React, Bun js, MongoDB, and Socket.io. DSync provides seamless messaging with delivery status indicators, typing indicators, and push notifications.

## ✨ Features

- **Real-Time Messaging** - Instant message delivery using WebSockets
- **File & Image Sharing** - Upload and share files/images via Cloudinary
- **Message Actions** - Reply, edit, delete, and like messages
- **User Authentication** - Secure JWT-based authentication
- **Online Status** - See who's online in real-time
- **Responsive Design** - Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher or Bun js
- MongoDB database (local or MongoDB Atlas)
- Cloudinary account (for file uploads)

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
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**

   Copy the example env files and fill in your values:

   ```bash
   # Backend
   cp backend/.env.example backend/.env

   # Frontend
   cp frontend/.env.example frontend/.env
   ```

5. **Start the development servers**

   Backend (from `/backend` directory):

   ```bash
   npm run dev
   ```

   Frontend (from `/frontend` directory):

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── globals.css           # Global styles
│   ├── layout.jsx            # Root layout with providers
│   ├── page.jsx              # Home page (redirects)
│   ├── login/page.jsx        # Login page
│   ├── register/page.jsx     # Register page
│   └── chat/
│       ├── page.jsx          # Chat page (no chat selected)
│       └── [chatId]/page.jsx # Chat page (with chat selected)
├── components/
│   ├── Auth/
│   │   ├── Login.jsx         # Login component
│   │   └── Register.jsx      # Register component
│   └── Chat/
│       ├── Chat.jsx          # Main chat container
│       ├── Sidebar.jsx       # Sidebar with chat list
│       ├── ChatList.jsx      # List of conversations
│       ├── ChatWindow.jsx    # Active chat window
│       ├── MessageInput.jsx  # Message input with file upload
│       ├── MessageList.jsx   # Message list with virtualization
│       ├── MessageItem.jsx   # Individual message display
│       ├── TypingIndicator.jsx
│       ├── UserSearch.jsx    # New chat search modal
│       └── ProfileModal.jsx  # Profile settings modal
├── context/
│   ├── AuthContext.jsx       # Authentication state
│   └── ThemeContext.jsx      # Theme toggle
├── hooks/
│   ├── useChat.js            # Chat data management
│   ├── useSocket.js          # Socket.io connection
│   └── useMessages.js        # Message management
├── lib/
│   ├── api.js                # Axios instance
│   └── storage.js            # localStorage utilities
├── styles/
│   ├── auth.css              # Auth page styles
│   └── chat.css              # Chat component styles
├── public/
│   ├── DSync.jpg             # Logo
│   └── paper-plane.png       # Icon
├── next.config.js            # Next.js configuration
├── package.json              # Updated dependencies
├── .env                      # Environment variables (NEXT_PUBLIC_*)
└── vercel.json               # Vercel deployment config
```

## 🔧 Configuration

### Backend Environment Variables

| Variable                | Description                          | Required |
| ----------------------- | ------------------------------------ | -------- |
| `PORT`                  | Server port (default: 5000)          | No       |
| `NODE_ENV`              | Environment (development/production) | No       |
| `MONGODB_URI`           | MongoDB connection string            | Yes      |
| `JWT_SECRET`            | Secret key for JWT tokens            | Yes      |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                | Yes      |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                   | Yes      |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                | Yes      |
| `FRONTEND_URL`          | Frontend URL for CORS                | No       |

### Frontend Environment Variables

| Variable          | Description          | Required |
| ----------------- | -------------------- | -------- |
| `VITE_API_URL`    | Backend API URL      | YES      |
| `VITE_SOCKET_URL` | Socket.io server URL | YES      |

## 🛠️ Tech Stack

### Frontend

- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Framer Motion** - Animations
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications
- **Lucide React** - Icons

### Backend

- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.io** - WebSocket server
- **JWT** - Authentication
- **Cloudinary** - File storage
- **Multer** - File upload handling

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) for real-time communication
- [Cloudinary](https://cloudinary.com/) for media storage
- [Lucide](https://lucide.dev/) for beautiful icons
- [Framer Motion](https://www.framer.com/motion/) for smooth animations

---

<p align="center">
  Made with ❤️ using the MERN Stack + Socket.io
</p>
